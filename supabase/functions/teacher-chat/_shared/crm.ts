// Notion CRM operations
import type { Student } from "./types.ts";

export async function searchNotionCRM(query: string): Promise<Student[]> {
  const notionKey = Deno.env.get("NOTION_API_KEY");
  const databaseId = Deno.env.get("NOTION_CRM_DATABASE_ID");

  if (!notionKey || !databaseId) {
    console.error("Missing Notion credentials");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 20,
        }),
      }
    );

    const data = await response.json();
    const students: Student[] = [];

    for (const page of data.results || []) {
      const props = page.properties || {};
      const nameObj = props["שם התלמיד"]?.title || [];
      const name = nameObj[0]?.plain_text || "";
      const status = props["סטטוס"]?.status?.name || "";
      const phone = props["טלפון תלמיד"]?.phone_number || "";

      if (name && name.toLowerCase().includes(query.toLowerCase())) {
        students.push({ id: page.id, name, status, phone });
      }
    }

    return students;
  } catch (error) {
    console.error("Notion search error:", error);
    return [];
  }
}

export async function addStudentToNotion(
  name: string,
  phone?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const notionKey = Deno.env.get("NOTION_API_KEY");
  const databaseId = Deno.env.get("NOTION_CRM_DATABASE_ID");

  if (!notionKey || !databaseId) {
    return { success: false, error: "Missing Notion credentials" };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          "שם התלמיד": {
            title: [{ text: { content: name } }],
          },
          ...(phone && {
            "טלפון תלמיד": { phone_number: phone },
          }),
          "סטטוס": {
            status: { name: "פעיל" },
          },
        },
      }),
    });

    const data = await response.json();

    if (data.id) {
      return { success: true, id: data.id };
    } else {
      return { success: false, error: data.message || "Failed to create" };
    }
  } catch (error) {
    console.error("Notion add error:", error);
    return { success: false, error: String(error) };
  }
}
