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
    newStudents: number;   // Less than 3 months
    veterans: number;      // 3+ months
    alternating: number;
    total: number;
  };
  groups: {
    thursday: number;
    sunday: number;
    newStudents: number;   // Less than 3 months
    veterans: number;      // 3+ months
    total: number;
  };
  veteransMarked: number;  // Explicitly marked with "תלמידים ותיקים" status
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

    // Detailed breakdown - separated by new (<3 months) and veteran (3+ months)
    let oneOnOneNew = 0;
    let oneOnOneVeteran = 0;
    let oneOnOneAlternating = 0;
    let groupThursdayNew = 0;
    let groupThursdayVeteran = 0;
    let groupSundayNew = 0;
    let groupSundayVeteran = 0;
    let veteransMarked = 0;  // Explicitly marked with status
    let pausedCount = 0;
    let completedCount = 0;
    let leadsCount = 0;
    let notRelevantCount = 0;

    for (const page of pages) {
      const statusProp = page.properties["סטטוס"];
      const status = statusProp?.status?.name || "unknown";
      const category = getCategory(status);
      const isVeteran = isVeteranByDate(page);

      // Count individual statuses with category
      if (!statusCounts[status]) {
        statusCounts[status] = { count: 0, category };
      }
      statusCounts[status].count++;

      // Categorize and count with new/veteran split
      switch (category) {
        case "oneOnOne":
          if (isVeteran) {
            oneOnOneVeteran++;
          } else {
            oneOnOneNew++;
          }
          break;
        case "oneOnOneAlternating":
          oneOnOneAlternating++;
          // Also count as veteran or new
          if (isVeteran) {
            oneOnOneVeteran++;
          } else {
            oneOnOneNew++;
          }
          break;
        case "groupThursday":
          if (isVeteran) {
            groupThursdayVeteran++;
          } else {
            groupThursdayNew++;
          }
          break;
        case "groupSunday":
          if (isVeteran) {
            groupSundayVeteran++;
          } else {
            groupSundayNew++;
          }
          break;
        case "veterans":
          veteransMarked++;
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
    }

    // Calculate totals
    const totalOneOnOne = oneOnOneNew + oneOnOneVeteran;
    const totalGroupThursday = groupThursdayNew + groupThursdayVeteran;
    const totalGroupSunday = groupSundayNew + groupSundayVeteran;
    const totalGroups = totalGroupThursday + totalGroupSunday;
    const totalGroupsNew = groupThursdayNew + groupSundayNew;
    const totalGroupsVeteran = groupThursdayVeteran + groupSundayVeteran;
    const totalActiveStudents = totalOneOnOne + totalGroups + veteransMarked;

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
            newStudents: oneOnOneNew,
            veterans: oneOnOneVeteran,
            alternating: oneOnOneAlternating,
            total: totalOneOnOne,
          },
          groups: {
            thursday: totalGroupThursday,
            sunday: totalGroupSunday,
            newStudents: totalGroupsNew,
            veterans: totalGroupsVeteran,
            total: totalGroups,
          },
          veteransMarked: veteransMarked,
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
