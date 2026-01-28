import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  "https://jldfxkbczzxawdqsznze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transliterations = [
  // א
  { hebrew_name: "אביב", english_variants: ["aviv", "avib"] },
  { hebrew_name: "אביגיל", english_variants: ["avigail", "avigayil", "abigail"] },
  { hebrew_name: "אביטל", english_variants: ["avital", "abital"] },
  { hebrew_name: "אדם", english_variants: ["adam"] },
  { hebrew_name: "אהרון", english_variants: ["aharon", "aaron", "aron"] },
  { hebrew_name: "אודי", english_variants: ["udi", "udy", "ody"] },
  { hebrew_name: "אופיר", english_variants: ["ofir", "ophir", "ofer"] },
  { hebrew_name: "אופרי", english_variants: ["ofri", "ophri", "opry"] },
  { hebrew_name: "אור", english_variants: ["or", "ohr"] },
  { hebrew_name: "אורי", english_variants: ["ori", "ory", "uri"] },
  { hebrew_name: "אורן", english_variants: ["oren", "oron"] },
  { hebrew_name: "אורית", english_variants: ["orit", "orrit"] },
  { hebrew_name: "איילה", english_variants: ["ayala", "ayelet", "ayla"] },
  { hebrew_name: "אילן", english_variants: ["ilan", "elan"] },
  { hebrew_name: "אילת", english_variants: ["eilat", "ilat", "elat"] },
  { hebrew_name: "איתי", english_variants: ["itay", "itai", "etay", "etai"] },
  { hebrew_name: "איתמר", english_variants: ["itamar", "etamar"] },
  { hebrew_name: "אלון", english_variants: ["alon", "elon"] },
  { hebrew_name: "אלי", english_variants: ["eli", "ely"] },
  { hebrew_name: "אליה", english_variants: ["eliya", "eliyahu", "elijah"] },
  { hebrew_name: "אלינור", english_variants: ["elinor", "eleanor", "alinor"] },
  { hebrew_name: "אלישבע", english_variants: ["elisheva", "elishba", "alishba"] },
  { hebrew_name: "אלעד", english_variants: ["elad", "elead"] },
  { hebrew_name: "אלרואי", english_variants: ["elroey", "elroy", "elroi"] },
  { hebrew_name: "אמיר", english_variants: ["amir", "ameer"] },
  { hebrew_name: "עמית", english_variants: ["amit", "amith"] },
  { hebrew_name: "ענבל", english_variants: ["inbal", "anabel", "anbal", "anabell"] },
  { hebrew_name: "אפרת", english_variants: ["efrat", "ephrat"] },
  { hebrew_name: "אריאל", english_variants: ["ariel", "ariell", "ariela"] },
  // ב
  { hebrew_name: "בועז", english_variants: ["boaz", "booz"] },
  { hebrew_name: "בן", english_variants: ["ben"] },
  { hebrew_name: "ברק", english_variants: ["barak", "baraq"] },
  // ג
  { hebrew_name: "גיא", english_variants: ["guy", "gai", "gye"] },
  { hebrew_name: "גיל", english_variants: ["gil", "gill"] },
  { hebrew_name: "גילי", english_variants: ["gili", "gilly", "gilee", "gilit"] },
  { hebrew_name: "גל", english_variants: ["gal", "gall"] },
  { hebrew_name: "גליה", english_variants: ["galya", "galia", "galiya"] },
  // ד
  { hebrew_name: "דביר", english_variants: ["dvir", "debir", "devir"] },
  { hebrew_name: "דוד", english_variants: ["david", "daveed", "daved"] },
  { hebrew_name: "דולב", english_variants: ["dolev"] },
  { hebrew_name: "דן", english_variants: ["dan"] },
  { hebrew_name: "דנה", english_variants: ["dana", "danna"] },
  { hebrew_name: "דניאל", english_variants: ["daniel", "danielle", "dani"] },
  { hebrew_name: "דפנה", english_variants: ["daphna", "dafna", "daphne"] },
  // ה
  { hebrew_name: "הדס", english_variants: ["hadas", "hadass"] },
  { hebrew_name: "הדר", english_variants: ["hadar", "haddar"] },
  { hebrew_name: "הילה", english_variants: ["hila", "hilla"] },
  { hebrew_name: "הלל", english_variants: ["hillel", "hilel", "hallel"] },
  // ז
  { hebrew_name: "זיו", english_variants: ["ziv", "zeev"] },
  { hebrew_name: "זכי", english_variants: ["zaki", "zacky", "zachi"] },
  // ח
  { hebrew_name: "חיים", english_variants: ["haim", "chaim", "hayim"] },
  { hebrew_name: "חן", english_variants: ["chen", "hen"] },
  { hebrew_name: "חנה", english_variants: ["hana", "hannah", "chana"] },
  { hebrew_name: "חנן", english_variants: ["hanan", "chanan"] },
  { hebrew_name: "חננאל", english_variants: ["hananel", "chananel"] },
  // ט
  { hebrew_name: "טל", english_variants: ["tal", "tall"] },
  { hebrew_name: "טליה", english_variants: ["talia", "talya", "tally"] },
  // י
  { hebrew_name: "יאיר", english_variants: ["yair", "jair"] },
  { hebrew_name: "יגאל", english_variants: ["yigal", "igal", "yegal"] },
  { hebrew_name: "יהונתן", english_variants: ["yonatan", "jonathan", "yehonatan"] },
  { hebrew_name: "יואב", english_variants: ["yoav", "joav", "yoab"] },
  { hebrew_name: "יובל", english_variants: ["yuval", "juval", "uval"] },
  { hebrew_name: "יונה", english_variants: ["yona", "jonah", "yonah"] },
  { hebrew_name: "יונתן", english_variants: ["yonatan", "jonathan", "jonatan"] },
  { hebrew_name: "יוסי", english_variants: ["yossi", "yosi", "jossi"] },
  { hebrew_name: "יעל", english_variants: ["yael", "jael", "yale"] },
  { hebrew_name: "ירדן", english_variants: ["yarden", "jordan"] },
  { hebrew_name: "ישראל", english_variants: ["israel", "yisrael", "isreal"] },
  // כ
  { hebrew_name: "כפיר", english_variants: ["kfir", "kefir"] },
  { hebrew_name: "כרמל", english_variants: ["carmel", "karmel", "carmela"] },
  // ל
  { hebrew_name: "לאה", english_variants: ["leah", "lea", "lia"] },
  { hebrew_name: "ליאור", english_variants: ["lior", "leor"] },
  { hebrew_name: "ליאל", english_variants: ["liel", "liell"] },
  { hebrew_name: "ליאן", english_variants: ["lian", "lianne", "leanne"] },
  { hebrew_name: "ליהי", english_variants: ["lihi", "lihie", "leehe"] },
  { hebrew_name: "לירז", english_variants: ["liraz", "lirazz"] },
  { hebrew_name: "לירון", english_variants: ["liron", "leeron"] },
  // מ
  { hebrew_name: "מאור", english_variants: ["maor", "meor"] },
  { hebrew_name: "מאיה", english_variants: ["maya", "maia", "mya"] },
  { hebrew_name: "מיה", english_variants: ["mia", "miya", "meya"] },
  { hebrew_name: "מיכאל", english_variants: ["michael", "mikael", "mikhael"] },
  { hebrew_name: "מיכל", english_variants: ["michal", "meechal"] },
  { hebrew_name: "מעיין", english_variants: ["maayan", "mayan", "maian"] },
  { hebrew_name: "מסרט", english_variants: ["meseret", "masrat", "mesrat"] },
  // נ
  { hebrew_name: "נגה", english_variants: ["noga", "nogah"] },
  { hebrew_name: "נדב", english_variants: ["nadav", "nadab"] },
  { hebrew_name: "נוי", english_variants: ["noy", "noi"] },
  { hebrew_name: "נועה", english_variants: ["noa", "noah", "noaa"] },
  { hebrew_name: "נועם", english_variants: ["noam", "noham"] },
  { hebrew_name: "נופר", english_variants: ["nofar", "nopher"] },
  { hebrew_name: "נטע", english_variants: ["neta", "netah"] },
  { hebrew_name: "ניב", english_variants: ["niv", "neev"] },
  { hebrew_name: "ניר", english_variants: ["nir", "neer"] },
  { hebrew_name: "נתנאל", english_variants: ["netanel", "nathaniel", "nathanel"] },
  // ס
  { hebrew_name: "סער", english_variants: ["saar", "sahar"] },
  { hebrew_name: "סתיו", english_variants: ["stav", "stave"] },
  // ע
  { hebrew_name: "עדי", english_variants: ["adi", "addy", "adee"] },
  { hebrew_name: "עדן", english_variants: ["eden", "aden"] },
  { hebrew_name: "עומר", english_variants: ["omer", "omar"] },
  { hebrew_name: "עופר", english_variants: ["ofer", "offer", "opher"] },
  { hebrew_name: "ענבר", english_variants: ["inbar", "anbar", "enbar"] },
  { hebrew_name: "ערן", english_variants: ["eran", "erann"] },
  // ק
  { hebrew_name: "קורל", english_variants: ["coral", "koral", "korall"] },
  // ר
  { hebrew_name: "רון", english_variants: ["ron", "ronn"] },
  { hebrew_name: "רוני", english_variants: ["roni", "ronny", "ronni"] },
  { hebrew_name: "רותם", english_variants: ["rotem", "rothem"] },
  { hebrew_name: "רז", english_variants: ["raz", "razz"] },
  // ש
  { hebrew_name: "שגיא", english_variants: ["sagi", "sagy", "saggie"] },
  { hebrew_name: "שובל", english_variants: ["shuval", "shoval", "shuvali"] },
  { hebrew_name: "שחר", english_variants: ["shachar", "shahar", "sahar"] },
  { hebrew_name: "שי", english_variants: ["shay", "shai", "shy"] },
  { hebrew_name: "שיר", english_variants: ["shir", "sheer"] },
  { hebrew_name: "שירה", english_variants: ["shira", "sheera"] },
  { hebrew_name: "שירז", english_variants: ["shiraz", "sheeraz"] },
  { hebrew_name: "שני", english_variants: ["shani", "shanni"] },
  { hebrew_name: "שרה", english_variants: ["sara", "sarah", "sahra"] },
  { hebrew_name: "שרון", english_variants: ["sharon", "sharron"] },
  // ת
  { hebrew_name: "תאיר", english_variants: ["tair", "tahir", "thair"] },
  { hebrew_name: "תהילה", english_variants: ["tehila", "tehilla", "tahila"] },
  { hebrew_name: "תום", english_variants: ["tom", "thom", "tome"] },
  { hebrew_name: "תומר", english_variants: ["tomer", "thomer"] },
  { hebrew_name: "תמר", english_variants: ["tamar", "tamara", "thamar"] },
  { hebrew_name: "תפארת", english_variants: ["tiferet", "tifaret"] },
];

async function main() {
  console.log("=== מתקין טבלת תעתיק ===\n");

  // Create table if not exists
  const { error: createError } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS public.name_transliterations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hebrew_name TEXT NOT NULL UNIQUE,
        english_variants TEXT[] NOT NULL,
        is_first_name BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_transliterations_hebrew ON public.name_transliterations(hebrew_name);
    `
  });

  if (createError) {
    // Table might already exist, continue
    console.log("הערה:", createError.message);
  }

  // Insert transliterations
  console.log("מוסיף", transliterations.length, "שמות...");

  for (const t of transliterations) {
    const { error } = await supabase
      .from("name_transliterations")
      .upsert({
        hebrew_name: t.hebrew_name,
        english_variants: t.english_variants,
        is_first_name: true
      }, { onConflict: "hebrew_name" });

    if (error && error.message && !error.message.includes("duplicate")) {
      console.log("שגיאה ב-" + t.hebrew_name + ":", error.message);
    }
  }

  console.log("✅ נוספו שמות לטבלת התעתיק");

  // Now run smart matching
  console.log("\n=== מריץ התאמה חכמה ===\n");

  // Get CRM names
  const NOTION_API_KEY = process.env.NOTION_API_KEY!;
  const NOTION_CRM_DATABASE_ID = process.env.NOTION_CRM_DATABASE_ID!;

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

  console.log("יש", pending?.length || 0, "שמות ממתינים");

  // Get transliterations from DB
  const { data: transData } = await supabase
    .from("name_transliterations")
    .select("hebrew_name, english_variants");

  const hebrewToEnglish = new Map<string, string[]>();
  const englishToHebrew = new Map<string, string>();

  for (const t of transData || []) {
    hebrewToEnglish.set(t.hebrew_name, t.english_variants);
    for (const eng of t.english_variants) {
      englishToHebrew.set(eng.toLowerCase(), t.hebrew_name);
    }
  }

  let matchedCount = 0;
  const matches: string[] = [];

  for (const p of pending || []) {
    const origLower = p.original_name.toLowerCase().trim();
    const origFirst = origLower.split(" ")[0];
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const crm of crmNames) {
      const crmLower = crm.toLowerCase();
      const crmFirst = crmLower.split(" ")[0];
      let score = 0;

      // Exact match
      if (origLower === crmLower) {
        bestMatch = crm;
        bestScore = 100;
        break;
      }

      // First name exact match
      if (origFirst === crmFirst) {
        score = 80;
      }
      // Transcript is first name of CRM
      else if (origLower === crmFirst) {
        score = 70;
      }
      // Check transliteration
      else {
        const hebrewName = englishToHebrew.get(origFirst);
        if (hebrewName && crmFirst.startsWith(hebrewName)) {
          score = 75;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = crm;
      }
    }

    if (bestMatch && bestScore >= 70) {
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
      matches.push(p.original_name + " → " + bestMatch + " (" + bestScore + ")");
    }
  }

  console.log("\n✅ הותאמו", matchedCount, "שמות נוספים");

  // Show some matches
  console.log("\nדוגמאות התאמות:");
  console.log(matches.slice(0, 30).join("\n"));

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
}

main();
