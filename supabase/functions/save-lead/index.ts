import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, sessionId, source, notes, metadata } = await req.json();

    // Validate required fields
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "Phone or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate lead (same phone or email in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let duplicateQuery = supabase
      .from("leads")
      .select("id, name, phone, email, created_at")
      .gte("created_at", oneDayAgo);

    if (phone) {
      duplicateQuery = duplicateQuery.eq("phone", phone);
    } else if (email) {
      duplicateQuery = duplicateQuery.eq("email", email);
    }

    const { data: existingLeads } = await duplicateQuery;

    if (existingLeads && existingLeads.length > 0) {
      // Lead already exists, just update the session reference if needed
      const existingLead = existingLeads[0];

      if (sessionId && !existingLead.chat_session_id) {
        await supabase
          .from("leads")
          .update({ chat_session_id: sessionId })
          .eq("id", existingLead.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          leadId: existingLead.id,
          duplicate: true,
          message: "Lead already exists"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new lead
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        chat_session_id: sessionId || null,
        source: source || "chat_widget",
        notes: notes || null,
        metadata: metadata || {},
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save lead", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update chat session with visitor info if sessionId provided
    if (sessionId) {
      await supabase
        .from("chat_sessions")
        .update({
          visitor_info: { name, email, phone },
        })
        .eq("id", sessionId);
    }

    console.log(`New lead saved: ${name} (${phone || email}) from ${source}`);

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        message: "Lead saved successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Save lead error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
