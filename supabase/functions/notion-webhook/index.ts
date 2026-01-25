import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notion expenses database ID
const NOTION_EXPENSES_DB_ID = "77c0b63767f04a0c960b1a5b2c784c08";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Handle Notion webhook verification
    if (body.verification_token) {
      const token = body.verification_token;
      console.log("===========================================");
      console.log("NOTION WEBHOOK VERIFICATION TOKEN:");
      console.log(token);
      console.log("===========================================");

      // Store the token in the database for easy retrieval
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase.from("cashflow_settings").upsert(
        { setting_key: "notion_webhook_token", setting_value: token },
        { onConflict: "setting_key" }
      );

      return new Response(JSON.stringify({ success: true, message: "Token received and stored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the event for debugging
    console.log("Notion webhook event:", JSON.stringify(body, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process webhook events
    const events = body.events || [body];

    for (const event of events) {
      const eventType = event.type || event.event_type;
      const pageId = event.page?.id || event.data?.id;

      console.log(`Processing event: ${eventType} for page: ${pageId}`);

      // Handle page updates (expense entries)
      if (eventType?.includes("page") && pageId) {
        // Fetch the full page data from Notion
        const notionApiKey = Deno.env.get("NOTION_API_KEY");
        if (!notionApiKey) {
          console.error("NOTION_API_KEY not configured");
          continue;
        }

        const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          headers: {
            "Authorization": `Bearer ${notionApiKey}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!pageRes.ok) {
          console.error(`Failed to fetch page ${pageId}:`, await pageRes.text());
          continue;
        }

        const pageData = await pageRes.json();

        // Check if this page belongs to our expenses database
        if (pageData.parent?.database_id?.replace(/-/g, "") !== NOTION_EXPENSES_DB_ID.replace(/-/g, "")) {
          console.log(`Page ${pageId} is not from expenses database, skipping`);
          continue;
        }

        // Extract expense data from Notion page properties
        const props = pageData.properties;
        const expenseData = {
          notion_page_id: pageId,
          name: props["שם"]?.title?.[0]?.plain_text || props["Name"]?.title?.[0]?.plain_text || "",
          amount: props["עלות חודשית"]?.number || props["Amount"]?.number || 0,
          category: props["קטגוריה"]?.select?.name || props["Category"]?.select?.name || "",
          description: props["מה זה פותר?"]?.rich_text?.[0]?.plain_text || "",
          updated_at: new Date().toISOString(),
        };

        console.log("Extracted expense data:", expenseData);

        // Upsert to notion_expenses_sync table
        const { error } = await supabase
          .from("notion_expenses_sync")
          .upsert(
            {
              notion_page_id: expenseData.notion_page_id,
              name: expenseData.name,
              amount: expenseData.amount,
              category: expenseData.category,
              description: expenseData.description,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "notion_page_id" }
          );

        if (error) {
          console.error("Failed to upsert expense:", error);
        } else {
          console.log(`Successfully synced expense: ${expenseData.name}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
