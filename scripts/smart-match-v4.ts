import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

// Extended transliteration map - English to Hebrew AND Hebrew to Hebrew
const nameVariants: Record<string, string[]> = {
  // English to Hebrew
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
  "boaz": ["בועז"],
  "ben": ["בן"],
  "barak": ["ברק"],
  "guy": ["גיא"], "gai": ["גיא"],
  "gil": ["גיל"],
  "gili": ["גילי"], "gilly": ["גילי"], "gilee": ["גילי"],
  "gal": ["גל"],
  "galia": ["גליה"], "galya": ["גליה"],
  "galit": ["גלית"],
  "gabriela": ["גבריאלה"],
  "dvir": ["דביר"], "debir": ["דביר"],
  "david": ["דוד"],
  "dolev": ["דולב"],
  "dan": ["דן"],
  "dana": ["דנה"],
  "daniel": ["דניאל"], "dani": ["דניאל"],
  "daphna": ["דפנה"], "dafna": ["דפנה"],
  "dina": ["דינה"],
  "hadas": ["הדס"],
  "hadar": ["הדר"],
  "hila": ["הילה"], "hilla": ["הילה"],
  "hillel": ["הלל"], "hilel": ["הלל"],
  "hannah": ["חנה"], "hana": ["חנה"],
  "hanan": ["חנן"],
  "ziv": ["זיו"],
  "zaki": ["זכי"], "zachi": ["זכי"],
  "haim": ["חיים"], "chaim": ["חיים"],
  "chen": ["חן"],
  "hananel": ["חננאל"],
  "tal": ["טל"],
  "talia": ["טליה"], "talya": ["טליה"],
  "timna": ["תמנע", "טמנע"],
  "yair": ["יאיר"],
  "yigal": ["יגאל"], "igal": ["יגאל"],
  "yonatan": ["יונתן", "יהונתן"], "jonathan": ["יונתן", "יהונתן"],
  "yoav": ["יואב"],
  "yuval": ["יובל"],
  "yona": ["יונה"],
  "yossi": ["יוסי"], "yosi": ["יוסי"],
  "yael": ["יעל"],
  "yarden": ["ירדן"], "jordan": ["ירדן"],
  "israel": ["ישראל"],
  "ido": ["עידו", "אידו"],
  "kfir": ["כפיר"],
  "carmel": ["כרמל"], "karmel": ["כרמל"], "carmela": ["כרמלה"],
  "karl": ["קרל"],
  "leah": ["לאה"], "lea": ["לאה"],
  "lior": ["ליאור"],
  "liel": ["ליאל"],
  "lian": ["ליאן"],
  "lihi": ["ליהי"],
  "liraz": ["לירז"],
  "liron": ["לירון"],
  "maor": ["מאור"],
  "maya": ["מאיה", "מיה"],
  "mia": ["מיה"],
  "michael": ["מיכאל"], "mikael": ["מיכאל"], "mikhal": ["מיכל"],
  "michal": ["מיכל"],
  "maayan": ["מעיין"],
  "moran": ["מורן"],
  "meseret": ["מסרט"],
  "mor": ["מור"],
  "noga": ["נגה"],
  "nadav": ["נדב"],
  "noy": ["נוי"], "noi": ["נוי"],
  "noa": ["נועה"], "noah": ["נועה"],
  "noam": ["נועם"],
  "nofar": ["נופר"],
  "neta": ["נטע"], "netta": ["נטע"],
  "niv": ["ניב"],
  "nir": ["ניר"],
  "netanel": ["נתנאל"], "nathaniel": ["נתנאל"],
  "naama": ["נעמה"],
  "nicole": ["ניקול"],
  "natalie": ["נטלי"],
  "saar": ["סער"],
  "stav": ["סתיו"],
  "simon": ["שמעון", "סימון"],
  "adi": ["עדי"],
  "eden": ["עדן"],
  "omer": ["עומר"], "omar": ["עומר"],
  "inbar": ["ענבר"],
  "eran": ["ערן"],
  "edna": ["עדנה"],
  "asaf": ["אסף"],
  "coral": ["קורל"], "koral": ["קורל"], "korl": ["קורל"],
  "ron": ["רון"],
  "roni": ["רוני"], "ronny": ["רוני"],
  "rotem": ["רותם"],
  "raz": ["רז"],
  "sagi": ["שגיא"],
  "shoval": ["שובל"], "shuval": ["שובל"],
  "shachar": ["שחר"], "shahar": ["שחר"],
  "shay": ["שי"], "shai": ["שי"],
  "shir": ["שיר"], "shiri": ["שירי"],
  "shira": ["שירה"],
  "shiraz": ["שירז"],
  "shani": ["שני"],
  "sara": ["שרה"], "sarah": ["שרה"],
  "sharon": ["שרון"],
  "shirley": ["שירלי"],
  "shaked": ["שקד"],
  "tair": ["תאיר"],
  "tehila": ["תהילה"],
  "tom": ["תום"],
  "tomer": ["תומר"],
  "tamar": ["תמר"],
  "tiferet": ["תפארת"],
  "alishba": ["אלישבע"], "elishba": ["אלישבע"],
  "ilia": ["איליה"], "ilya": ["איליה"],
  "olga": ["אולגה"],
  "violetta": ["ויולטה"],
  "adan": ["עדן"],
  "adal": ["עדל"],

  // Hebrew variations (for Hebrew names in transcripts)
  "אלרואי": ["אלרואי"],
  "אפרת": ["אפרת"],
  "עידו": ["עידו"],
  "לירז": ["לירז"],
  "מסרט": ["מסרט"],
};

async function main() {
  console.log("=== התאמה חכמה V4 - כולל עברית ===\n");

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
  const noMatch: {name: string, count: number}[] = [];

  // Get transcript counts for sorting
  const { data: counts } = await supabase
    .from("student_name_mappings")
    .select("original_name, transcript_count")
    .eq("status", "pending");

  const countMap = new Map(counts?.map(c => [c.original_name, c.transcript_count]) || []);

  for (const p of pending || []) {
    const origLower = p.original_name.toLowerCase().trim();
    const origFirst = origLower.split(" ")[0];

    // Get possible Hebrew names for this name (could be English or Hebrew)
    const possibleHebrew = nameVariants[origFirst] || [];

    let bestMatch: string | null = null;
    let bestScore = 0;
    let matchReason = "";

    for (const crm of crmNames) {
      const crmLower = crm.toLowerCase().trim();
      const crmFirst = crmLower.split(" ")[0];
      let score = 0;
      let reason = "";

      // 1. Exact full match (Hebrew or English)
      if (origLower === crmLower) {
        score = 100;
        reason = "exact";
      }
      // 2. First name exact match
      else if (origFirst === crmFirst) {
        score = 90;
        reason = "first-exact";
      }
      // 3. Hebrew transcript matches CRM first name exactly
      else if (origFirst === crmFirst) {
        score = 85;
        reason = "hebrew-first";
      }
      // 4. Transcript is exactly CRM first name
      else if (origLower === crmFirst) {
        score = 80;
        reason = "is-first";
      }
      // 5. Transliteration match (English -> Hebrew)
      else if (possibleHebrew.length > 0) {
        for (const heb of possibleHebrew) {
          if (crmFirst.startsWith(heb) || crmFirst === heb) {
            score = 75;
            reason = "translit";
            break;
          }
        }
      }
      // 6. CRM starts with transcript (for short names)
      else if (origFirst.length >= 3 && crmFirst.startsWith(origFirst)) {
        score = 60;
        reason = "starts-with";
      }
      // 7. Transcript contains CRM first (substring match)
      else if (origFirst.length >= 3 && crmFirst.includes(origFirst)) {
        score = 55;
        reason = "contains";
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = crm;
        matchReason = reason;
      }
    }

    if (bestMatch && bestScore >= 55) {
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
      noMatch.push({ name: p.original_name, count: countMap.get(p.original_name) || 0 });
    }
  }

  console.log("✅ הותאמו", matchedCount, "שמות נוספים\n");

  console.log("=== התאמות שנמצאו ===");
  for (const m of matches) {
    console.log(m);
  }

  // Sort unmatched by count
  noMatch.sort((a, b) => b.count - a.count);

  console.log("\n=== שמות שלא נמצאה התאמה (" + noMatch.length + ") - לפי כמות תמלולים ===");
  for (const n of noMatch.slice(0, 50)) {
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
