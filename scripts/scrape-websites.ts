/**
 * Website Content Scraper for RAG System
 *
 * Scrapes voicely.co.il and juniors.voicely.co.il
 * and stores content with embeddings in Supabase for semantic search.
 *
 * Usage:
 *   npx tsx scripts/scrape-websites.ts           # Scrape all websites
 *   npx tsx scripts/scrape-websites.ts --main    # Scrape main site only
 *   npx tsx scripts/scrape-websites.ts --juniors # Scrape juniors site only
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as crypto from "crypto";

// Configuration
const CONFIG = {
  CHUNK_SIZE: 800,
  CHUNK_OVERLAP: 100,
  BATCH_SIZE: 5,
  DELAY_BETWEEN_REQUESTS_MS: 500,
};

// Website URLs to scrape
const WEBSITES = {
  voicely_main: {
    baseUrl: "https://www.voicely.co.il",
    pages: [
      { path: "/", type: "page" },
      { path: "/about", type: "page" },
      { path: "/services", type: "service" },
      { path: "/pricing", type: "pricing" },
      { path: "/faq", type: "faq" },
      { path: "/blog", type: "blog_post" },
      { path: "/contact", type: "page" },
    ],
  },
  voicely_juniors: {
    baseUrl: "https://juniors.voicely.co.il",
    pages: [
      { path: "/", type: "page" },
      { path: "/program", type: "course" },
      { path: "/pricing", type: "pricing" },
      { path: "/about", type: "page" },
    ],
  },
};

// Environment validation
function validateEnv() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Initialize clients
function initClients() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  return { supabase, openai };
}

// Fetch and parse HTML content
async function fetchPage(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Voicely-RAG-Bot/1.0",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      console.log(`  Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Extract main content (basic HTML stripping)
    let content = html
      // Remove scripts and styles
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    return { title, content };
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error);
    return null;
  }
}

// Generate content hash for change detection
function generateHash(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

// Split text into chunks for embedding
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CONFIG.CHUNK_SIZE, text.length);

    // Try to break at sentence boundary
    let breakPoint = end;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastQuestion = text.lastIndexOf("?", end);
      const lastExclamation = text.lastIndexOf("!", end);
      const bestBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (bestBreak > start + CONFIG.CHUNK_SIZE / 2) {
        breakPoint = bestBreak;
      }
    }

    const chunk = text.slice(start, breakPoint + 1).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = breakPoint + 1 - CONFIG.CHUNK_OVERLAP;
    if (start <= 0 || breakPoint >= text.length - 1) {
      break;
    }
  }

  return chunks;
}

// Generate embedding using OpenAI
async function generateEmbedding(
  openai: OpenAI,
  text: string
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Main scrape function
async function scrapeWebsites(sources: string[] = ["voicely_main", "voicely_juniors"]) {
  console.log(`Starting website scrape for: ${sources.join(", ")}`);

  validateEnv();
  const { supabase, openai } = initClients();

  for (const sourceName of sources) {
    const sourceKey = sourceName as keyof typeof WEBSITES;
    const website = WEBSITES[sourceKey];

    if (!website) {
      console.log(`Unknown source: ${sourceName}`);
      continue;
    }

    console.log(`\nScraping ${sourceName}...`);

    // Start scrape log
    const { data: scrapeLog } = await supabase
      .from("website_scrape_log")
      .insert({
        source: sourceName,
        status: "started",
      })
      .select()
      .single();

    let pagesScraped = 0;
    let pagesAdded = 0;
    let pagesUpdated = 0;
    let pagesFailed = 0;

    for (const page of website.pages) {
      const url = `${website.baseUrl}${page.path}`;
      console.log(`  Fetching: ${url}`);

      try {
        const result = await fetchPage(url);
        if (!result || result.content.length < 100) {
          console.log(`    Skipped - no content`);
          pagesFailed++;
          continue;
        }

        pagesScraped++;

        const contentHash = generateHash(result.content);

        // Check if content changed
        const { data: existing } = await supabase
          .from("website_content")
          .select("id, content_hash")
          .eq("source_url", url)
          .single();

        if (existing && existing.content_hash === contentHash) {
          console.log(`    Unchanged - skipping`);
          continue;
        }

        // Upsert content
        const { data: content, error: contentError } = await supabase
          .from("website_content")
          .upsert(
            {
              source: sourceName,
              source_url: url,
              content_type: page.type,
              title: result.title,
              content: result.content,
              content_hash: contentHash,
              last_scraped_at: new Date().toISOString(),
            },
            {
              onConflict: "source_url",
            }
          )
          .select()
          .single();

        if (contentError) {
          console.error(`    Error saving content:`, contentError);
          pagesFailed++;
          continue;
        }

        // Generate chunks and embeddings
        const chunks = chunkText(result.content);
        console.log(`    Generated ${chunks.length} chunks`);

        // Delete old chunks
        await supabase
          .from("website_content_chunks")
          .delete()
          .eq("content_id", content.id);

        // Insert new chunks with embeddings
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await generateEmbedding(openai, chunk);

          await supabase.from("website_content_chunks").insert({
            content_id: content.id,
            chunk_index: i,
            content: chunk,
            embedding: embedding,
          });
        }

        if (existing) {
          pagesUpdated++;
        } else {
          pagesAdded++;
        }

        console.log(`    ✓ Saved`);

        // Rate limiting
        await new Promise((r) => setTimeout(r, CONFIG.DELAY_BETWEEN_REQUESTS_MS));
      } catch (error) {
        console.error(`    Error:`, error);
        pagesFailed++;
      }
    }

    // Update scrape log
    if (scrapeLog) {
      await supabase
        .from("website_scrape_log")
        .update({
          status: "completed",
          pages_scraped: pagesScraped,
          pages_added: pagesAdded,
          pages_updated: pagesUpdated,
          pages_failed: pagesFailed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", scrapeLog.id);
    }

    console.log(`  Completed: ${pagesScraped} pages, ${pagesAdded} added, ${pagesUpdated} updated`);
  }

  console.log("\n✅ Website scrape completed!");
}

// Run
const args = process.argv.slice(2);
let sources: string[] = [];

if (args.includes("--main")) {
  sources.push("voicely_main");
}
if (args.includes("--juniors")) {
  sources.push("voicely_juniors");
}

if (sources.length === 0) {
  sources = ["voicely_main", "voicely_juniors"];
}

scrapeWebsites(sources);
