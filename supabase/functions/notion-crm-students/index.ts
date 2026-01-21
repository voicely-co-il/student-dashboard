import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
const NOTION_CRM_DATABASE_ID = Deno.env.get("NOTION_CRM_DATABASE_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CRMStudent {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

// Active statuses (students currently learning)
const ACTIVE_STATUSES = [
  "לומד 1:1",
  "לומד 1:1 לסירוגין",
  "לומד בקבוצה חמישי",
  "לומד בקבוצה -ראשון",
  "תלמידים ותיקים🎵",
];

async function fetchAllStudents(): Promise<CRMStudent[]> {
  const students: CRMStudent[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  while (hasMore) {
    const body: Record<string, unknown> = { page_size: 100 };
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
      throw new Error(`Notion API error: ${error}`);
    }

    const data = await response.json();

    for (const page of data.results) {
      // Get student name from "שם התלמיד" field (title)
      const nameProperty = page.properties["שם התלמיד"];
      const name = nameProperty?.title?.[0]?.plain_text?.trim();

      if (!name) continue;

      // Get status
      const statusProperty = page.properties["סטטוס"];
      const status = statusProperty?.status?.name || "לא ידוע";

      // Get phone
      const phoneProperty = page.properties["טלפון תלמיד"];
      const phone = phoneProperty?.phone_number || null;

      // Get email
      const emailProperty = page.properties["מייל"];
      const email = emailProperty?.email || null;

      students.push({
        id: page.id,
        name,
        status,
        phone,
        email,
        isActive: ACTIVE_STATUSES.includes(status),
      });
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  return students;
}

// Normalize name for fuzzy matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zא-ת0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Find best matches for a given name
function findMatches(
  searchName: string,
  students: CRMStudent[],
  limit: number = 5
): CRMStudent[] {
  const normalized = normalizeName(searchName);
  const firstName = normalized.split(" ")[0];

  // Score each student
  const scored = students.map((student) => {
    const studentNorm = normalizeName(student.name);
    const studentFirst = studentNorm.split(" ")[0];

    let score = 0;

    // Exact match
    if (studentNorm === normalized) {
      score = 100;
    }
    // Starts with search name
    else if (studentNorm.startsWith(normalized)) {
      score = 80;
    }
    // First name exact match
    else if (studentFirst === firstName && firstName.length >= 3) {
      score = 70;
    }
    // Contains search name
    else if (studentNorm.includes(normalized)) {
      score = 50;
    }
    // First name starts with
    else if (studentFirst.startsWith(firstName) && firstName.length >= 2) {
      score = 40;
    }
    // Partial match
    else if (
      normalized.includes(studentFirst) ||
      studentNorm.includes(firstName)
    ) {
      score = 30;
    }

    // Boost active students
    if (student.isActive && score > 0) {
      score += 10;
    }

    return { student, score };
  });

  // Filter and sort by score
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.student);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!NOTION_API_KEY || !NOTION_CRM_DATABASE_ID) {
      throw new Error("Missing Notion configuration");
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search");

    const students = await fetchAllStudents();

    // If search query provided, return matches
    if (search) {
      const matches = findMatches(search, students);
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return all students (sorted: active first, then alphabetically)
    const sorted = students.sort((a, b) => {
      // Active students first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name, "he");
    });

    return new Response(
      JSON.stringify({
        students: sorted,
        total: sorted.length,
        active: sorted.filter((s) => s.isActive).length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
