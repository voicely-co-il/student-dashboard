import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voicely context for AI relevance scoring
const VOICELY_CONTEXT = `
Voicely is an online singing and voice school in Israel. We're building an AI Lab to test new AI tools.

HIGHLY RELEVANT topics (score 80-100):
- Voice AI, TTS, STT, voice cloning, speech synthesis
- Real-time voice/audio processing
- Video generation, AI avatars, lip sync
- ComfyUI workflows
- EdTech, personalized learning
- Content creation for education
- Open source AI tools with APIs

MODERATELY RELEVANT (score 50-79):
- General AI tools that could be adapted
- Image generation (for marketing)
- Automation tools
- No-code/low-code AI

LOW RELEVANCE (score 0-49):
- Pure research/academic papers without code
- Enterprise-only solutions
- NLP/text-only tools
- Requires GPU clusters
- Crypto/blockchain AI
- Gaming AI (unless voice-related)
`;

interface NewsletterItem {
  title: string;
  url: string;
  description: string;
}

// Extract items from newsletter HTML
function extractItemsFromHtml(html: string, source: string): NewsletterItem[] {
  const items: NewsletterItem[] = [];

  // Different patterns for different newsletters
  if (source.includes("bensbites") || source.includes("Ben's Bites")) {
    // Ben's Bites format: look for links with descriptions
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      // Filter out navigation/footer links
      if (
        title.length > 10 &&
        !url.includes("unsubscribe") &&
        !url.includes("mailto:") &&
        !url.includes("twitter.com") &&
        !url.includes("linkedin.com") &&
        !title.toLowerCase().includes("view in browser")
      ) {
        items.push({ title, url, description: "" });
      }
    }
  } else if (source.includes("benina") || source.includes("נועם")) {
    // נועם - בינה בקיצור format
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      if (
        title.length > 5 &&
        !url.includes("unsubscribe") &&
        !url.includes("mailto:")
      ) {
        items.push({ title, url, description: "" });
      }
    }
  }

  // Dedupe by URL
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 30); // Limit to 30 items per newsletter
}

// Detect newsletter source from email
function detectSource(from: string, subject: string): { name: string; id: string } | null {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  if (fromLower.includes("bensbites") || fromLower.includes("ben tossell")) {
    return { name: "Ben's Bites", id: "bens-bites" };
  }
  if (fromLower.includes("benina") || fromLower.includes("נועם") || subjectLower.includes("בינה בקיצור")) {
    return { name: "נועם - בינה בקיצור", id: "noam-benina" };
  }
  if (fromLower.includes("tldr")) {
    return { name: "TLDR AI", id: "tldr-ai" };
  }
  if (fromLower.includes("therundown")) {
    return { name: "TheRundown AI", id: "therundown" };
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);

    // Parse incoming email (from email forwarding service or manual submission)
    const body = await req.json();
    const { from, subject, html, text, date } = body;

    if (!from || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: from, subject, html/text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source
    const source = detectSource(from, subject);
    if (!source) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown newsletter source: ${from}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing newsletter: ${source.name} - ${subject}`);

    // Get or create source in DB
    let { data: dbSource } = await supabase
      .from("inspiration_sources")
      .select("id, tags")
      .eq("name", source.name)
      .single();

    if (!dbSource) {
      // Create source if doesn't exist
      const { data: newSource, error } = await supabase
        .from("inspiration_sources")
        .insert({
          name: source.name,
          type: "newsletter",
          url: `email://${source.id}`,
          tags: ["newsletter", "ai"],
          relevance_score: 85,
          is_active: true,
          fetch_enabled: false, // Email-based, not RSS
        })
        .select()
        .single();

      if (error) throw error;
      dbSource = newSource;
    }

    // Extract items from HTML
    const content = html || text;
    const items = extractItemsFromHtml(content, source.name);

    console.log(`Found ${items.length} items in newsletter`);

    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No items extracted from newsletter",
          source: source.name,
          subject
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing URLs to avoid duplicates
    const { data: existingItems } = await supabase
      .from("ideas_backlog")
      .select("source_url")
      .eq("source_id", dbSource.id);

    const existingUrls = new Set(existingItems?.map(i => i.source_url) || []);

    // Process each item with AI scoring
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    let itemsAdded = 0;
    let itemsFiltered = 0;

    for (const item of items) {
      // Skip duplicates
      if (existingUrls.has(item.url)) continue;

      // Score with AI
      const prompt = `${VOICELY_CONTEXT}

Analyze this newsletter item for Voicely AI Lab:

Title: ${item.title}
URL: ${item.url}
Source: ${source.name}

Return JSON only (no markdown):
{
  "score": <0-100>,
  "reason": "<1 sentence why this score>",
  "summary": "<2-3 sentence summary of what this likely is and how Voicely could use it>",
  "category": "<voice_ai|vision_ai|content_ai|analytics|other>"
}`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const { score, reason, summary, category } = JSON.parse(jsonMatch[0]);

          // Filter by minimum score
          if (score < 40) {
            itemsFiltered++;
            continue;
          }

          // Insert into ideas_backlog
          const { error: insertError } = await supabase.from("ideas_backlog").insert({
            source_id: dbSource.id,
            title: item.title.slice(0, 500),
            description: item.description || null,
            source_url: item.url,
            source_date: date ? new Date(date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            category: category || "other",
            tags: dbSource.tags || [],
            status: "new",
            ai_summary: summary,
            ai_relevance_score: score,
            ai_relevance_reason: reason,
          });

          if (!insertError) {
            itemsAdded++;
          }
        }
      } catch (e) {
        console.error(`Error processing item: ${item.title}`, e);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Log the ingestion
    await supabase.from("fetch_log").insert({
      source_id: dbSource.id,
      items_found: items.length,
      items_added: itemsAdded,
      items_filtered: itemsFiltered,
      duration_ms: 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        source: source.name,
        subject,
        items_found: items.length,
        items_added: itemsAdded,
        items_filtered: itemsFiltered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
