import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
const NOTION_CRM_DATABASE_ID = Deno.env.get("NOTION_CRM_DATABASE_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Names to exclude (devices or obvious non-students)
const EXCLUDED_NAMES = new Set([
  "the", "iphone", "asus", "a", // Device names or single letters
]);

// Statuses that indicate a real student (not a lead or irrelevant)
const STUDENT_STATUSES = new Set([
  "לומד 1:1",
  "לומד 1:1 לסירוגין",
  "לומד בקבוצה חמישי",
  "לומד בקבוצה -ראשון",
  "תלמידים ותיקים🎵",
  "סיימו ללמוד",
  "בהפסקה",
]);

interface StudentSession {
  studentName: string;
  sessionCount: number;
  firstSession: string | null;
  lastSession: string | null;
  crmStatus?: string;
  crmStartDate?: string;
  notionId?: string;
}

interface NotionPage {
  id: string;
  created_time: string;
  properties: {
    [key: string]: any;
  };
}

// Get title (student name) from Notion page
function getStudentName(page: NotionPage): string | null {
  const props = page.properties;
  // Find the title property
  for (const [key, value] of Object.entries(props)) {
    if (value.type === "title" && value.title?.[0]?.text?.content) {
      return value.title[0].text.content.trim();
    }
  }
  return null;
}

// Get status from Notion page
function getStatus(page: NotionPage): string | null {
  return page.properties["סטטוס"]?.status?.name || null;
}

// Get start date from Notion page
function getStartDate(page: NotionPage): string | null {
  return page.properties["התחלה"]?.date?.start || null;
}

// Fetch all pages from Notion CRM
async function fetchNotionPages(): Promise<NotionPage[]> {
  if (!NOTION_API_KEY || !NOTION_CRM_DATABASE_ID) {
    console.log("Notion credentials not configured");
    return [];
  }

  const allPages: NotionPage[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) {
      body.start_cursor = nextCursor;
    }

    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CRM_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Notion API error:", error);
      return allPages;
    }

    const data = await response.json();
    allPages.push(...data.results);
    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  return allPages;
}

// Normalize student names for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['"]/g, "");
}

// Common Hebrew-English name mappings
const NAME_TRANSLATIONS: Record<string, string[]> = {
  "gili": ["גילי"],
  "גילי": ["gili"],
  "adi": ["עדי"],
  "עדי": ["adi"],
  "ophir": ["אופיר", "עופר"],
  "אופיר": ["ophir", "ofir"],
  "ofir": ["אופיר", "עופר"],
  "ofri": ["עופרי"],
  "עופרי": ["ofri"],
  "ben": ["בן"],
  "בן": ["ben"],
  "michael": ["מיכאל", "מיכל"],
  "מיכאל": ["michael"],
  "מיכל": ["michal", "michael"],
  "michal": ["מיכל"],
  "yuval": ["יובל"],
  "יובל": ["yuval"],
  "adam": ["אדם"],
  "אדם": ["adam"],
  "carmel": ["כרמל"],
  "כרמל": ["carmel"],
  "coral": ["קורל"],
  "קורל": ["coral"],
  "guy": ["גיא"],
  "גיא": ["guy"],
  "hanan": ["חנן"],
  "חנן": ["hanan"],
  "netanel": ["נתנאל"],
  "נתנאל": ["netanel"],
};

// Find Notion page by name - tries exact match, first name match, and translations
function findNotionPage(
  transcriptName: string,
  notionByFullName: Record<string, NotionPage>,
  notionByFirstName: Record<string, NotionPage[]>
): NotionPage | undefined {
  const normalized = normalizeName(transcriptName);

  // 1. Try exact full name match
  if (notionByFullName[normalized]) {
    return notionByFullName[normalized];
  }

  // 2. Try translated name
  const translations = NAME_TRANSLATIONS[normalized] || [];
  for (const translation of translations) {
    if (notionByFullName[translation]) {
      return notionByFullName[translation];
    }
    // Also try first name match with translation
    const matches = notionByFirstName[translation];
    if (matches && matches.length === 1) {
      return matches[0];
    }
  }

  // 3. Try first name match (only if unique)
  const firstNameMatches = notionByFirstName[normalized];
  if (firstNameMatches && firstNameMatches.length === 1) {
    return firstNameMatches[0];
  }

  return undefined;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session counts from transcripts
    const { data: transcriptData, error: transcriptError } = await supabase
      .from("transcripts")
      .select("student_name, lesson_date")
      .not("student_name", "is", null);

    if (transcriptError) {
      throw transcriptError;
    }

    // Group by student_name and count sessions
    const sessionsByStudent: Record<string, { count: number; dates: string[] }> = {};

    for (const transcript of transcriptData || []) {
      const name = transcript.student_name;
      if (!name) continue;

      if (!sessionsByStudent[name]) {
        sessionsByStudent[name] = { count: 0, dates: [] };
      }
      sessionsByStudent[name].count++;
      if (transcript.lesson_date) {
        sessionsByStudent[name].dates.push(transcript.lesson_date);
      }
    }

    // Fetch Notion CRM data
    const notionPages = await fetchNotionPages();

    // Create maps for name matching
    const notionByFullName: Record<string, NotionPage> = {};
    const notionByFirstName: Record<string, NotionPage[]> = {};

    for (const page of notionPages) {
      const fullName = getStudentName(page);
      if (fullName) {
        const normalizedFull = normalizeName(fullName);
        notionByFullName[normalizedFull] = page;

        // Also index by first name only
        const firstName = normalizedFull.split(" ")[0];
        if (!notionByFirstName[firstName]) {
          notionByFirstName[firstName] = [];
        }
        notionByFirstName[firstName].push(page);
      }
    }

    // Build the final list with CRM data enrichment
    const students: StudentSession[] = [];

    for (const [name, data] of Object.entries(sessionsByStudent)) {
      const sortedDates = data.dates.sort();
      const normalizedName = normalizeName(name);

      // Skip excluded names
      if (EXCLUDED_NAMES.has(normalizedName)) {
        continue;
      }

      const notionPage = findNotionPage(name, notionByFullName, notionByFirstName);

      students.push({
        studentName: name,
        sessionCount: data.count,
        firstSession: sortedDates[0] || null,
        lastSession: sortedDates[sortedDates.length - 1] || null,
        crmStatus: notionPage ? getStatus(notionPage) : undefined,
        crmStartDate: notionPage ? getStartDate(notionPage) : undefined,
        notionId: notionPage?.id,
      });
    }

    // Filter: only keep students who are in CRM with student status, or have high session count
    const filteredStudents = students.filter(s => {
      // If in CRM with student status - keep
      if (s.crmStatus && STUDENT_STATUSES.has(s.crmStatus)) {
        return true;
      }
      // If not in CRM but has 3+ sessions - might be a real student with different name spelling
      if (!s.notionId && s.sessionCount >= 3) {
        return true;
      }
      return false;
    });

    // Sort: CRM-connected students first, then by session count
    filteredStudents.sort((a, b) => {
      // Students with student status come first
      const aIsStudent = a.crmStatus && STUDENT_STATUSES.has(a.crmStatus);
      const bIsStudent = b.crmStatus && STUDENT_STATUSES.has(b.crmStatus);
      if (aIsStudent && !bIsStudent) return -1;
      if (!aIsStudent && bIsStudent) return 1;
      // Then sort by session count
      return b.sessionCount - a.sessionCount;
    });

    // Return the result
    return new Response(
      JSON.stringify({
        students: filteredStudents,
        totalStudents: filteredStudents.length,
        totalSessions: filteredStudents.reduce((sum, s) => sum + s.sessionCount, 0),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
