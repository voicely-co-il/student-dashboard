import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

// Extended transliteration map with more variants
const nameVariants: Record<string, string[]> = {
  // English to Hebrew mappings
  "eden": ["עדן"],
  "israel": ["ישראל"],
  "tiferet": ["תפארת"],
  "hanan": ["חנן"],
  "elroy": ["אלרואי"],
  "efrat": ["אפרת"],
  "carmela": ["כרמלה", "כרמל"],
  "asaf": ["אסף"],
  "mor": ["מור", "מורן"],
  "ido": ["עידו"],
  "ilya": ["איליה", "ליה"],
  "natalie": ["נטלי", "נטליה"],
  "natali": ["נטלי", "נטליה"],
  "boni": ["בוני"],
  "amos": ["עמוס"],
  "liraz": ["לירז"],
  "meseret": ["מסרט"],
  // Hebrew to itself (for exact matching)
  "עדן": ["עדן"],
  "ישראל": ["ישראל"],
  "תפארת": ["תפארת"],
  "חנן": ["חנן"],
  "אלרואי": ["אלרואי"],
  "אפרת": ["אפרת"],
  "אסף": ["אסף"],
  "עידו": ["עידו"],
  "נטלי": ["נטלי", "נטליה"],
  "עמוס": ["עמוס"],
  "לירז": ["לירז"],
  "מסרט": ["מסרט"],
  "מור": ["מור", "מורן"],
};

async function main() {
  console.log("=== התאמה חכמה V5 - שיפור נוסף ===\n");

  // Get CRM names
  const crmNames: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CRM_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ start_cursor: startCursor, page_size: 100 }),
      }
    );
    const data = await response.json();
    for (const page of data.results || []) {
      const name = page.properties["שם התלמיד"]?.title?.[0]?.plain_text || "";
      if (name) crmNames.push(name);
    }
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log("נמצאו", crmNames.length, "תלמידים ב-CRM");

  // Get pending mappings
  const { data: pending } = await supabase
    .from("student_name_mappings")
    .select("id, original_name, transcript_count")
    .eq("status", "pending")
    .order("transcript_count", { ascending: false });

  console.log("יש", pending?.length || 0, "שמות ממתינים\n");

  let matchedCount = 0;
  const matches: string[] = [];
  const suggestionsAdded: string[] = [];
  const noMatch: {name: string, count: number}[] = [];

  for (const p of pending || []) {
    const origLower = p.original_name.toLowerCase().trim();
    const origFirst = origLower.split(" ")[0];

    // Get possible Hebrew names for this name
    const possibleHebrew = nameVariants[origFirst] || [];

    let bestMatch: string | null = null;
    let bestScore = 0;
    let matchReason = "";

    for (const crm of crmNames) {
      const crmLower = crm.toLowerCase().trim();
      const crmFirst = crmLower.split(" ")[0];
      let score = 0;
      let reason = "";

      // 1. Exact full match
      if (origLower === crmLower) {
        score = 100;
        reason = "exact";
      }
      // 2. First name exact match
      else if (origFirst === crmFirst) {
        score = 90;
        reason = "first-exact";
      }
      // 3. Transcript name is CRM first name
      else if (origLower === crmFirst) {
        score = 85;
        reason = "is-first";
      }
      // 4. Transliteration match
      else if (possibleHebrew.length > 0) {
        for (const heb of possibleHebrew) {
          if (crmFirst === heb || crmFirst.startsWith(heb)) {
            score = 75;
            reason = "translit";
            break;
          }
        }
      }
      // 5. CRM first starts with transcript first
      else if (origFirst.length >= 3 && crmFirst.startsWith(origFirst)) {
        score = 65;
        reason = "starts-with";
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = crm;
        matchReason = reason;
      }
    }

    if (bestMatch && bestScore >= 75) {
      // High confidence - auto match
      await supabase
        .from("student_name_mappings")
        .update({
          crm_match: bestMatch,
          status: "auto_matched",
          resolved_name: bestMatch
        })
        .eq("id", p.id);

      matchedCount++;
      matches.push(`✅ ${p.original_name} → ${bestMatch} (${bestScore}, ${matchReason})`);
    } else if (bestMatch && bestScore >= 55) {
      // Lower confidence - just add suggestion
      await supabase
        .from("student_name_mappings")
        .update({
          crm_match: bestMatch,
        })
        .eq("id", p.id);

      suggestionsAdded.push(`💡 ${p.original_name} → הצעה: ${bestMatch} (${bestScore}, ${matchReason})`);
    } else {
      noMatch.push({ name: p.original_name, count: p.transcript_count || 0 });
    }
  }

  console.log("✅ הותאמו אוטומטית:", matchedCount, "שמות\n");

  if (matches.length > 0) {
    console.log("=== התאמות אוטומטיות ===");
    for (const m of matches) {
      console.log(m);
    }
  }

  if (suggestionsAdded.length > 0) {
    console.log("\n=== הצעות (לא אוטומטי - דורש אישור) ===");
    for (const s of suggestionsAdded) {
      console.log(s);
    }
  }

  // Sort unmatched by count
  noMatch.sort((a, b) => b.count - a.count);

  console.log("\n=== שמות ללא התאמה (" + noMatch.length + ") ===");
  for (const n of noMatch.slice(0, 30)) {
    console.log(`${n.name}: ${n.count} תמלולים`);
  }

  // Final stats
  const { data: stats } = await supabase
    .from("student_name_mappings")
    .select("status");

  const byStatus = {
    pending: stats?.filter(s => s.status === "pending").length || 0,
    auto_matched: stats?.filter(s => s.status === "auto_matched").length || 0,
    approved: stats?.filter(s => s.status === "approved").length || 0,
    rejected: stats?.filter(s => s.status === "rejected").length || 0,
  };

  console.log("\n=== סטטיסטיקה סופית ===");
  console.log("ממתינים:", byStatus.pending);
  console.log("אוטומטי:", byStatus.auto_matched);
  console.log("מאושר:", byStatus.approved);
  console.log("נדחה:", byStatus.rejected);
  console.log("סה\"כ:", stats?.length);
  console.log("\n📍 לביקורת ענבל: /admin/name-resolution");
}

main();
