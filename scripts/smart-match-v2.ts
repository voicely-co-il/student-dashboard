import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

// Build transliteration maps
const englishToHebrew: Record<string, string[]> = {
  // א
  "aviv": ["אביב"],
  "avigail": ["אביגיל"], "abigail": ["אביגיל"],
  "avital": ["אביטל"],
  "adam": ["אדם"],
  "udi": ["אודי"], "udy": ["אודי"],
  "ofir": ["אופיר", "עופר"], "ophir": ["אופיר", "עופר"], "ofer": ["אופיר", "עופר"],
  "ofri": ["אופרי", "עופרי"], "ophri": ["אופרי"],
  "or": ["אור"],
  "ori": ["אורי"], "uri": ["אורי"],
  "oren": ["אורן"],
  "orit": ["אורית"],
  "ayala": ["איילה"], "ayla": ["איילה"],
  "ilan": ["אילן"], "elan": ["אילן"],
  "eilat": ["אילת"], "ilat": ["אילת"],
  "itay": ["איתי"], "itai": ["איתי"], "etay": ["איתי"],
  "itamar": ["איתמר"],
  "alon": ["אלון"], "elon": ["אלון"],
  "eli": ["אלי"],
  "elad": ["אלעד"],
  "elroy": ["אלרואי"], "elroey": ["אלרואי"],
  "amir": ["אמיר"],
  "amit": ["עמית"],
  "inbal": ["ענבל"], "anabel": ["ענבל"], "anbal": ["ענבל"],
  "efrat": ["אפרת"],
  "ariel": ["אריאל"], "ariela": ["אריאל"],
  // ב
  "boaz": ["בועז"],
  "ben": ["בן"],
  "barak": ["ברק"],
  // ג
  "guy": ["גיא"], "gai": ["גיא"],
  "gil": ["גיל"],
  "gili": ["גילי"], "gilly": ["גילי"], "gilee": ["גילי"],
  "gal": ["גל"],
  "galia": ["גליה"], "galya": ["גליה"],
  // ד
  "dvir": ["דביר"], "debir": ["דביר"],
  "david": ["דוד"],
  "dolev": ["דולב"],
  "dan": ["דן"],
  "dana": ["דנה"],
  "daniel": ["דניאל"], "dani": ["דניאל"],
  "daphna": ["דפנה"], "dafna": ["דפנה"],
  // ה
  "hadas": ["הדס"],
  "hadar": ["הדר"],
  "hila": ["הילה"], "hilla": ["הילה"],
  "hillel": ["הלל"], "hilel": ["הלל"],
  // ז
  "ziv": ["זיו"],
  "zaki": ["זכי"], "zachi": ["זכי"],
  // ח
  "haim": ["חיים"], "chaim": ["חיים"],
  "chen": ["חן"],
  "hana": ["חנה"], "hannah": ["חנה"],
  "hanan": ["חנן"],
  "hananel": ["חננאל"],
  // ט
  "tal": ["טל"],
  "talia": ["טליה"], "talya": ["טליה"],
  // י
  "yair": ["יאיר"],
  "yigal": ["יגאל"], "igal": ["יגאל"],
  "yonatan": ["יונתן", "יהונתן"], "jonathan": ["יונתן"],
  "yoav": ["יואב"],
  "yuval": ["יובל"],
  "yona": ["יונה"],
  "yossi": ["יוסי"], "yosi": ["יוסי"],
  "yael": ["יעל"],
  "yarden": ["ירדן"], "jordan": ["ירדן"],
  "israel": ["ישראל"],
  // כ
  "kfir": ["כפיר"],
  "carmel": ["כרמל"], "karmel": ["כרמל"],
  // ל
  "leah": ["לאה"], "lea": ["לאה"],
  "lior": ["ליאור"],
  "liel": ["ליאל"],
  "lian": ["ליאן"],
  "lihi": ["ליהי"],
  "liraz": ["לירז"],
  "liron": ["לירון"],
  // מ
  "maor": ["מאור"],
  "maya": ["מאיה", "מיה"],
  "mia": ["מיה"],
  "michael": ["מיכאל"], "mikael": ["מיכאל"],
  "michal": ["מיכל"],
  "maayan": ["מעיין"],
  // נ
  "noga": ["נגה"],
  "nadav": ["נדב"],
  "noy": ["נוי"], "noi": ["נוי"],
  "noa": ["נועה"], "noah": ["נועה"],
  "noam": ["נועם"],
  "nofar": ["נופר"],
  "neta": ["נטע"],
  "niv": ["ניב"],
  "nir": ["ניר"],
  "netanel": ["נתנאל"], "nathaniel": ["נתנאל"],
  // ס
  "saar": ["סער"],
  "stav": ["סתיו"],
  // ע
  "adi": ["עדי"],
  "eden": ["עדן"],
  "omer": ["עומר"], "omar": ["עומר"],
  "inbar": ["ענבר"],
  "eran": ["ערן"],
  // ק
  "coral": ["קורל"], "koral": ["קורל"],
  // ר
  "ron": ["רון"],
  "roni": ["רוני"], "ronny": ["רוני"],
  "rotem": ["רותם"],
  "raz": ["רז"],
  // ש
  "sagi": ["שגיא"],
  "shoval": ["שובל"],
  "shachar": ["שחר"], "shahar": ["שחר"],
  "shay": ["שי"], "shai": ["שי"],
  "shir": ["שיר"],
  "shira": ["שירה"],
  "shiraz": ["שירז"],
  "shani": ["שני"],
  "sara": ["שרה"], "sarah": ["שרה"],
  "sharon": ["שרון"],
  // ת
  "tair": ["תאיר"],
  "tehila": ["תהילה"],
  "tom": ["תום"],
  "tomer": ["תומר"],
  "tamar": ["תמר"],
  "tiferet": ["תפארת"],
};

async function main() {
  console.log("=== התאמה חכמה V2 עם Transliteration ===\n");

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
    .select("id, original_name")
    .eq("status", "pending");

  console.log("יש", pending?.length || 0, "שמות ממתינים\n");

  let matchedCount = 0;
  const matches: string[] = [];
  const noMatch: string[] = [];

  for (const p of pending || []) {
    const origLower = p.original_name.toLowerCase().trim();
    const origFirst = origLower.split(" ")[0];

    // Get possible Hebrew names for this English name
    const possibleHebrew = englishToHebrew[origFirst] || [];

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
        score = 85;
        reason = "first-exact";
      }
      // 3. Transcript is exactly CRM first name
      else if (origLower === crmFirst) {
        score = 80;
        reason = "is-first";
      }
      // 4. Transliteration match
      else if (possibleHebrew.length > 0) {
        for (const heb of possibleHebrew) {
          if (crmFirst.startsWith(heb) || crmFirst === heb) {
            score = 75;
            reason = "translit";
            break;
          }
        }
      }
      // 5. CRM starts with transcript (for short names like Ben)
      else if (origFirst.length >= 3 && crmFirst.startsWith(origFirst)) {
        score = 60;
        reason = "starts-with";
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = crm;
        matchReason = reason;
      }
    }

    if (bestMatch && bestScore >= 60) {
      // Update the mapping
      await supabase
        .from("student_name_mappings")
        .update({
          crm_match: bestMatch,
          status: "auto_matched",
          resolved_name: bestMatch
        })
        .eq("id", p.id);

      matchedCount++;
      matches.push(`${p.original_name} → ${bestMatch} (${bestScore}, ${matchReason})`);
    } else {
      noMatch.push(p.original_name);
    }
  }

  console.log("✅ הותאמו", matchedCount, "שמות נוספים\n");

  console.log("=== התאמות שנמצאו ===");
  for (const m of matches.slice(0, 40)) {
    console.log(m);
  }

  console.log("\n=== שמות שלא נמצאה התאמה (" + noMatch.length + ") ===");
  console.log(noMatch.slice(0, 40).join(", "));

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
}

main();
