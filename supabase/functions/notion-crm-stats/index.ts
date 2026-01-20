import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
const NOTION_CRM_DATABASE_ID = Deno.env.get("NOTION_CRM_DATABASE_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Status categorization - detailed breakdown
const STATUS_CONFIG = {
  // Active 1:1 students
  oneOnOne: ["לומד 1:1"],
  oneOnOneAlternating: ["לומד 1:1 לסירוגין"],
  // Active group students
  groupThursday: ["לומד בקבוצה חמישי"],
  groupSunday: ["לומד בקבוצה -ראשון"],
  // Veterans (marked explicitly)
  veterans: ["תלמידים ותיקים🎵"],
  // Paused
  paused: ["בהפסקה"],
  // Completed
  completed: ["סיימו ללמוד"],
  // Not relevant
  notRelevant: ["לא רלוונטי", "לא מעוניין אונליין", "לא מעוניין -יקר"],
  // Leads (potential students)
  leads: [
    "Voicely Junior מתעניינים",
    "Juniors-במסנג'ר",
    "לתזמן שיחה",
    "אין מענה",
    "הודעת וואטסאפ ראשונית",
    "שיעור ניסיון 20 דק - לקבוצה",
    "שיעור ניסיון 20 דק -1:1",
    "ממתין לקבוצה 12-14",
    "ממתין לקבוצה 10-12",
    "ממתין קבוצה שלישי 10-12",
    "תשובה -לגבי 1:1",
  ],
};

// 3 months in milliseconds (for veteran calculation)
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

interface NotionPage {
  id: string;
  created_time: string;
  properties: {
    [key: string]: any;
  };
}

interface StudentBreakdown {
  oneOnOne: {
    regular: number;
    alternating: number;
    total: number;
  };
  groups: {
    thursday: number;
    sunday: number;
    total: number;
  };
  veterans: {
    marked: number;      // Explicitly marked as veteran
    calculated: number;  // Over 3 months (from active students)
    total: number;
  };
}

interface CRMStats {
  totalEntries: number;
  activeStudents: {
    total: number;
    breakdown: StudentBreakdown;
  };
  pausedStudents: number;
  completedStudents: number;
  leads: number;
  notRelevant: number;
  statusBreakdown: { status: string; count: number; category: string }[];
}

async function fetchAllPages(): Promise<NotionPage[]> {
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
      throw new Error(`Notion API error: ${error}`);
    }

    const data = await response.json();
    allPages.push(...data.results);
    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  return allPages;
}

function getCategory(status: string): string {
  for (const [category, statuses] of Object.entries(STATUS_CONFIG)) {
    if (statuses.includes(status)) {
      return category;
    }
  }
  return "other";
}

function isVeteranByDate(page: NotionPage): boolean {
  // Check "התחלה" (start date) field if exists
  const startDate = page.properties["התחלה"]?.date?.start;
  if (startDate) {
    const start = new Date(startDate);
    const now = new Date();
    return (now.getTime() - start.getTime()) > THREE_MONTHS_MS;
  }

  // Fallback to created_time
  const created = new Date(page.created_time);
  const now = new Date();
  return (now.getTime() - created.getTime()) > THREE_MONTHS_MS;
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

    const pages = await fetchAllPages();

    // Initialize counters
    const statusCounts: Record<string, { count: number; category: string }> = {};

    // Detailed breakdown
    let oneOnOneRegular = 0;
    let oneOnOneAlternating = 0;
    let groupThursday = 0;
    let groupSunday = 0;
    let veteransMarked = 0;
    let veteransCalculated = 0;
    let pausedCount = 0;
    let completedCount = 0;
    let leadsCount = 0;
    let notRelevantCount = 0;

    for (const page of pages) {
      const statusProp = page.properties["סטטוס"];
      const status = statusProp?.status?.name || "unknown";
      const category = getCategory(status);

      // Count individual statuses with category
      if (!statusCounts[status]) {
        statusCounts[status] = { count: 0, category };
      }
      statusCounts[status].count++;

      // Track if this is an active student (for veteran calculation)
      let isActiveStudent = false;

      // Categorize and count
      switch (category) {
        case "oneOnOne":
          oneOnOneRegular++;
          isActiveStudent = true;
          break;
        case "oneOnOneAlternating":
          oneOnOneAlternating++;
          isActiveStudent = true;
          break;
        case "groupThursday":
          groupThursday++;
          isActiveStudent = true;
          break;
        case "groupSunday":
          groupSunday++;
          isActiveStudent = true;
          break;
        case "veterans":
          veteransMarked++;
          // Veterans are also active students
          isActiveStudent = true;
          break;
        case "paused":
          pausedCount++;
          break;
        case "completed":
          completedCount++;
          break;
        case "leads":
          leadsCount++;
          break;
        case "notRelevant":
          notRelevantCount++;
          break;
      }

      // Check if active student is a veteran by date (3+ months)
      if (isActiveStudent && category !== "veterans" && isVeteranByDate(page)) {
        veteransCalculated++;
      }
    }

    // Calculate totals
    const totalOneOnOne = oneOnOneRegular + oneOnOneAlternating;
    const totalGroups = groupThursday + groupSunday;
    const totalActiveStudents = totalOneOnOne + totalGroups + veteransMarked;
    const totalVeterans = veteransMarked + veteransCalculated;

    // Sort status breakdown by count
    const statusBreakdown = Object.entries(statusCounts)
      .map(([status, data]) => ({
        status,
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count);

    const stats: CRMStats = {
      totalEntries: pages.length,
      activeStudents: {
        total: totalActiveStudents,
        breakdown: {
          oneOnOne: {
            regular: oneOnOneRegular,
            alternating: oneOnOneAlternating,
            total: totalOneOnOne,
          },
          groups: {
            thursday: groupThursday,
            sunday: groupSunday,
            total: totalGroups,
          },
          veterans: {
            marked: veteransMarked,
            calculated: veteransCalculated,
            total: totalVeterans,
          },
        },
      },
      pausedStudents: pausedCount,
      completedStudents: completedCount,
      leads: leadsCount,
      notRelevant: notRelevantCount,
      statusBreakdown,
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
