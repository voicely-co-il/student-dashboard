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

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  content?: string;
}

// Simple RSS parser
async function parseRSS(rssUrl: string): Promise<RSSItem[]> {
  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Voicely AI Lab RSS Fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }

  const xml = await response.text();
  const items: RSSItem[] = [];

  // Simple regex-based parsing (works for most RSS/Atom feeds)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  const matches = xml.matchAll(itemRegex);

  for (const match of matches) {
    const itemXml = match[1] || match[2];

    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href=["']([^"']+)["']/i);
    const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const dateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>|<published[^>]*>([\s\S]*?)<\/published>|<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const contentMatch = itemXml.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>|<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);

    if (titleMatch) {
      items.push({
        title: cleanText(titleMatch[1]),
        link: linkMatch ? (linkMatch[1] || linkMatch[2])?.trim() : "",
        description: descMatch ? cleanText(descMatch[1] || descMatch[2]) : undefined,
        pubDate: dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3])?.trim() : undefined,
        content: contentMatch ? cleanText(contentMatch[1] || contentMatch[2]) : undefined,
      });
    }
  }

  return items.slice(0, 20); // Limit to 20 items per feed
}

function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000); // Limit length
}

async function scoreRelevance(
  genAI: GoogleGenerativeAI,
  item: RSSItem,
  sourceTags: string[]
): Promise<{ score: number; reason: string; summary: string }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `${VOICELY_CONTEXT}

Analyze this content for Voicely AI Lab:

Title: ${item.title}
Description: ${item.description || "N/A"}
Source tags: ${sourceTags.join(", ")}

Return JSON only (no markdown):
{
  "score": <0-100>,
  "reason": "<1 sentence why this score>",
  "summary": "<2-3 sentence summary of what this is and how Voicely could use it>"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("AI scoring error:", error);
  }

  // Fallback: score based on tags
  const voicelyKeywords = ["voice", "audio", "tts", "speech", "video", "comfyui", "avatar", "education", "learning"];
  const matchedKeywords = voicelyKeywords.filter(
    (kw) =>
      item.title.toLowerCase().includes(kw) ||
      (item.description || "").toLowerCase().includes(kw) ||
      sourceTags.some((t) => t.toLowerCase().includes(kw))
  );

  const fallbackScore = Math.min(30 + matchedKeywords.length * 15, 80);

  return {
    score: fallbackScore,
    reason: matchedKeywords.length > 0
      ? `Contains keywords: ${matchedKeywords.join(", ")}`
      : "No specific Voicely keywords found",
    summary: item.description?.slice(0, 200) || item.title,
  };
}

function categorizeItem(title: string, description: string, tags: string[]): string {
  const text = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

  if (text.match(/voice|audio|tts|speech|sound|speak/)) return "voice_ai";
  if (text.match(/video|avatar|animate|motion|visual/)) return "vision_ai";
  if (text.match(/content|image|generat|creat|design/)) return "content_ai";
  if (text.match(/analytic|data|metric|dashboard/)) return "analytics";

  return "other";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);

    // Get request body (optional: specific source_id)
    let sourceId: string | null = null;
    let minRelevanceScore = 50; // Default: only add items with score >= 50

    try {
      const body = await req.json();
      sourceId = body.source_id || null;
      minRelevanceScore = body.min_relevance_score ?? 50;
    } catch {
      // No body or invalid JSON - fetch all enabled sources
    }

    // Get sources to fetch
    let query = supabase
      .from("inspiration_sources")
      .select("*")
      .eq("fetch_enabled", true)
      .not("rss_url", "is", null);

    if (sourceId) {
      query = query.eq("id", sourceId);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      throw new Error(`Failed to get sources: ${sourcesError.message}`);
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No sources to fetch", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const source of sources) {
      const sourceStartTime = Date.now();
      let itemsFound = 0;
      let itemsAdded = 0;
      let itemsFiltered = 0;
      let error: string | null = null;

      try {
        console.log(`Fetching: ${source.name} (${source.rss_url})`);

        // Fetch RSS
        const items = await parseRSS(source.rss_url);
        itemsFound = items.length;

        // Get existing URLs to avoid duplicates
        const { data: existingItems } = await supabase
          .from("ideas_backlog")
          .select("source_url")
          .eq("source_id", source.id);

        const existingUrls = new Set(existingItems?.map((i) => i.source_url) || []);

        // Process each item
        for (const item of items) {
          // Skip if already exists
          if (existingUrls.has(item.link)) {
            continue;
          }

          // Score relevance with AI
          const { score, reason, summary } = await scoreRelevance(
            genAI,
            item,
            source.tags || []
          );

          // Filter by minimum score
          if (score < minRelevanceScore) {
            itemsFiltered++;
            continue;
          }

          // Categorize
          const category = categorizeItem(
            item.title,
            item.description || "",
            source.tags || []
          );

          // Calculate reading time (rough estimate)
          const wordCount = (item.content || item.description || "").split(/\s+/).length;
          const readingTime = Math.max(1, Math.ceil(wordCount / 200));

          // Insert into ideas_backlog
          const { error: insertError } = await supabase.from("ideas_backlog").insert({
            source_id: source.id,
            title: item.title.slice(0, 500),
            description: item.description?.slice(0, 2000),
            source_url: item.link,
            source_date: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : null,
            category,
            tags: source.tags || [],
            status: "new",
            ai_summary: summary,
            ai_relevance_score: score,
            ai_relevance_reason: reason,
            content_html: item.content?.slice(0, 10000),
            reading_time_min: readingTime,
          });

          if (insertError) {
            console.error(`Insert error for ${item.title}:`, insertError);
          } else {
            itemsAdded++;
          }

          // Rate limit: small delay between AI calls
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Update source last_fetched_at
        await supabase
          .from("inspiration_sources")
          .update({
            last_fetched_at: new Date().toISOString(),
            last_fetch_error: null,
          })
          .eq("id", source.id);

      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        console.error(`Error fetching ${source.name}:`, error);

        // Update source with error
        await supabase
          .from("inspiration_sources")
          .update({
            last_fetch_error: error,
          })
          .eq("id", source.id);
      }

      const duration = Date.now() - sourceStartTime;

      // Log fetch result
      await supabase.from("fetch_log").insert({
        source_id: source.id,
        items_found: itemsFound,
        items_added: itemsAdded,
        items_filtered: itemsFiltered,
        error,
        duration_ms: duration,
      });

      results.push({
        source: source.name,
        items_found: itemsFound,
        items_added: itemsAdded,
        items_filtered: itemsFiltered,
        error,
        duration_ms: duration,
      });
    }

    const totalDuration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        total_duration_ms: totalDuration,
        sources_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
