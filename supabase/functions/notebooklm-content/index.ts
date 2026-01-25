import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateFromContentBody {
  action: "generate_from_content";
  title: string;
  content: string;
  outputs: ("podcast" | "slides" | "infographic")[];
  question?: string;
}

interface CheckStatusBody {
  action: "check_status";
  content_id: string;
}

type RequestBody = GenerateFromContentBody | CheckStatusBody | { action: string };

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: RequestBody = await req.json();
    const { action } = body;

    switch (action) {
      case "generate_from_content": {
        const { title, content, outputs, question } = body as GenerateFromContentBody;

        if (!title || !content || !outputs || outputs.length === 0) {
          return new Response(
            JSON.stringify({ error: "title, content, and outputs are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate a unique notebook ID for this batch
        const batchId = crypto.randomUUID();
        const createdIds: string[] = [];

        // Create a record for each output type
        for (const outputType of outputs) {
          const { data: contentRecord, error: insertError } = await supabase
            .from("notebooklm_content")
            .insert({
              created_by: user.id,
              notebook_id: batchId,
              notebook_name: title,
              content_type: outputType,
              title: `${title} - ${outputType === "podcast" ? "פודקסט" : outputType === "slides" ? "מצגת" : "אינפוגרפיקה"}`,
              source_content: content,
              settings: {},
              status: "pending",
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Insert error:", insertError);
            continue;
          }

          if (contentRecord) {
            createdIds.push(contentRecord.id);
          }
        }

        // If there's a question, create a question record too
        if (question) {
          const { data: questionRecord, error: questionError } = await supabase
            .from("notebooklm_content")
            .insert({
              created_by: user.id,
              notebook_id: batchId,
              notebook_name: title,
              content_type: "question",
              title: question.substring(0, 100),
              prompt: question,
              source_content: content,
              settings: {},
              status: "pending",
            })
            .select("id")
            .single();

          if (!questionError && questionRecord) {
            createdIds.push(questionRecord.id);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            batch_id: batchId,
            created_ids: createdIds,
            created_count: createdIds.length,
            message: `נוצרו ${createdIds.length} פריטים בתור העיבוד`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_status": {
        const { content_id } = body as CheckStatusBody;

        if (!content_id) {
          return new Response(
            JSON.stringify({ error: "content_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: contentData, error } = await supabase
          .from("notebooklm_content")
          .select("*")
          .eq("id", content_id)
          .single();

        if (error || !contentData) {
          return new Response(
            JSON.stringify({ error: "Content not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, content: contentData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
