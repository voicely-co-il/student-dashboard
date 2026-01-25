/**
 * NotebookLM Queue Processor
 *
 * This script runs locally and processes pending NotebookLM content requests.
 * It uses the NotebookLM MCP server via HTTP transport.
 *
 * Prerequisites:
 *   Start MCP server first: notebooklm-mcp --transport http --port 3456
 *
 * Usage:
 *   npx tsx scripts/process-notebooklm-queue.ts
 *   npx tsx scripts/process-notebooklm-queue.ts --watch  # Continuous mode
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const MCP_URL = process.env.NOTEBOOKLM_MCP_URL || "http://localhost:3456";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface NotebookLMContent {
  id: string;
  notebook_id: string;
  notebook_name: string;
  content_type: "podcast" | "slides" | "infographic" | "question";
  prompt: string | null;
  settings: Record<string, unknown>;
  status: string;
  source_content: string | null;
  title: string | null;
}

interface MCPToolCallResponse {
  content?: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

// Session management for MCP HTTP transport
let mcpSessionId: string | null = null;

async function checkMCPHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MCP_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}

async function initMCPSession(): Promise<string> {
  if (mcpSessionId) return mcpSessionId;

  const response = await fetch(`${MCP_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "voicely-worker", version: "1.0" },
      },
    }),
  });

  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error("Failed to get MCP session ID");
  }
  mcpSessionId = sessionId;
  console.log("MCP session initialized:", sessionId);
  return sessionId;
}

function parseSSEResponse(text: string): Record<string, unknown> {
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  // Try parsing as plain JSON
  return JSON.parse(text);
}

async function callMCPTool(
  name: string,
  args: Record<string, unknown>
): Promise<MCPToolCallResponse> {
  const sessionId = await initMCPSession();

  const response = await fetch(`${MCP_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const data = parseSSEResponse(text);
  if ((data as { error?: { message?: string } }).error) {
    const err = (data as { error: { message?: string } }).error;
    throw new Error(`MCP RPC error: ${err.message || JSON.stringify(err)}`);
  }
  return (data as { result: MCPToolCallResponse }).result;
}

function parseToolResult(result: MCPToolCallResponse): Record<string, unknown> {
  if (result.structuredContent) return result.structuredContent;
  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { raw: result.content[0].text };
    }
  }
  return {};
}

// Process a single content item
async function processContentItem(item: NotebookLMContent): Promise<void> {
  console.log(`\n📦 Processing ${item.content_type}: ${item.notebook_name || item.id}`);

  // Update status to processing
  await supabase
    .from("notebooklm_content")
    .update({ status: "processing", progress_percent: 10 })
    .eq("id", item.id);

  try {
    // Step 1: Create a new notebook for this content
    console.log("  📓 Creating notebook...");
    const createResult = await callMCPTool("notebook_create", {
      title: item.notebook_name || item.title || "Voicely Content",
    });
    const notebookData = parseToolResult(createResult);
    // MCP returns { status, notebook: { id, title, url } }
    const notebook = (notebookData as { notebook?: { id?: string } }).notebook;
    const notebookId = notebook?.id || (notebookData as { notebook_id?: string }).notebook_id;

    if (!notebookId) {
      throw new Error("Failed to create notebook: " + JSON.stringify(notebookData));
    }
    console.log(`  ✅ Notebook created: ${notebookId}`);

    // Step 2: Add source content to the notebook
    const sourceText = item.source_content || "";
    if (!sourceText) {
      throw new Error("No source content to add");
    }

    console.log("  📝 Adding source content...");
    await callMCPTool("notebook_add_text", {
      notebook_id: notebookId,
      text: sourceText,
      title: item.title || "Lesson Content",
    });
    console.log("  ✅ Source added");

    // Update progress
    await supabase
      .from("notebooklm_content")
      .update({ progress_percent: 30, task_id: notebookId })
      .eq("id", item.id);

    // Step 3: Generate content based on type
    let generateTool = "";
    const generateArgs: Record<string, unknown> = {
      notebook_id: notebookId,
      language: "he",
      confirm: true,
    };

    switch (item.content_type) {
      case "podcast":
        generateTool = "audio_overview_create";
        generateArgs.format = "deep_dive";
        generateArgs.length = "default";
        break;
      case "slides":
        generateTool = "slide_deck_create";
        generateArgs.format = "detailed_deck";
        break;
      case "infographic":
        generateTool = "infographic_create";
        generateArgs.orientation = "landscape";
        generateArgs.detail_level = "standard";
        break;
      case "question":
        generateTool = "notebook_query";
        generateArgs.query = item.prompt || "סכם את התוכן בנקודות מרכזיות";
        delete generateArgs.confirm;
        break;
    }

    if (!generateTool) {
      throw new Error(`Unknown content type: ${item.content_type}`);
    }

    console.log(`  🎨 Generating ${item.content_type}...`);
    const genResult = await callMCPTool(generateTool, generateArgs);
    const genData = parseToolResult(genResult);
    console.log("  ✅ Generation initiated");

    // For questions, update answer directly
    if (item.content_type === "question") {
      const answer =
        (genData as { answer?: string }).answer ||
        (genData as { raw?: string }).raw ||
        JSON.stringify(genData);

      await supabase
        .from("notebooklm_content")
        .update({
          status: "completed",
          progress_percent: 100,
          answer,
          task_id: notebookId,
        })
        .eq("id", item.id);

      console.log(`  ✅ Question answered`);
      return;
    }

    // For studio content, poll for completion
    await supabase
      .from("notebooklm_content")
      .update({ progress_percent: 50 })
      .eq("id", item.id);

    console.log("  ⏳ Waiting for studio generation...");

    let attempts = 0;
    const maxAttempts = item.content_type === "podcast" ? 60 : 30; // Podcasts take longer
    const pollInterval = 10000; // 10 seconds

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const statusResult = await callMCPTool("studio_status", {
        notebook_id: notebookId,
      });
      const statusData = parseToolResult(statusResult);

      const artifacts = (statusData as { artifacts?: Array<{ status: string; audio_url?: string; infographic_url?: string; slide_deck_url?: string; type: string }> }).artifacts || [];
      const artifactType = item.content_type === "podcast" ? "audio" : item.content_type;
      const matched = artifacts.find((a) => a.type === artifactType || a.type?.includes(artifactType));

      // Get the correct URL based on content type
      const contentUrl = matched?.audio_url || matched?.infographic_url || matched?.slide_deck_url;

      if (matched?.status === "completed" && contentUrl) {
        await supabase
          .from("notebooklm_content")
          .update({
            status: "completed",
            progress_percent: 100,
            content_url: contentUrl,
          })
          .eq("id", item.id);

        console.log(`  ✅ Completed! URL: ${contentUrl}`);
        return;
      }

      if (matched?.status === "failed") {
        throw new Error(`${item.content_type} generation failed`);
      }

      attempts++;
      const progress = 50 + Math.min(attempts * 2, 45);
      await supabase
        .from("notebooklm_content")
        .update({ progress_percent: progress })
        .eq("id", item.id);

      process.stdout.write(".");
    }

    // Timeout - but might still complete later
    console.log("\n  ⚠️ Timeout waiting for completion (will retry on next run)");

  } catch (error) {
    console.error(`\n  ❌ Error:`, error);

    await supabase
      .from("notebooklm_content")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", item.id);
  }
}

// Main processing loop
async function processQueue(): Promise<void> {
  console.log("\n🔍 Checking for pending items...");

  // Fetch pending items
  const { data: pendingItems, error } = await supabase
    .from("notebooklm_content")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("Error fetching pending items:", error);
    return;
  }

  if (!pendingItems || pendingItems.length === 0) {
    console.log("No pending items");
    return;
  }

  console.log(`Found ${pendingItems.length} pending items`);

  // Process items sequentially
  for (const item of pendingItems) {
    await processContentItem(item as NotebookLMContent);
  }
}

// Check and update stuck processing items
async function checkStuckItems(): Promise<void> {
  // Get items that have been processing for more than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: stuckItems } = await supabase
    .from("notebooklm_content")
    .select("id, task_id, content_type")
    .eq("status", "processing")
    .lt("updated_at", tenMinutesAgo);

  if (stuckItems && stuckItems.length > 0) {
    console.log(`\n🔧 Checking ${stuckItems.length} stuck items...`);

    for (const item of stuckItems) {
      if (!item.task_id) {
        // No notebook created yet, reset to pending
        await supabase
          .from("notebooklm_content")
          .update({ status: "pending" })
          .eq("id", item.id);
        console.log(`  Reset ${item.id} to pending`);
      } else {
        // Check studio status
        try {
          const statusResult = await callMCPTool("studio_status", {
            notebook_id: item.task_id,
          });
          const statusData = parseToolResult(statusResult);
          const artifacts = (statusData as { artifacts?: Array<{ status: string; url?: string; type: string }> }).artifacts || [];
          const artifactType = item.content_type === "podcast" ? "audio" : item.content_type;
          const matched = artifacts.find((a) => a.type === artifactType || a.type?.includes(artifactType));

          if (matched?.status === "completed" && matched.url) {
            await supabase
              .from("notebooklm_content")
              .update({
                status: "completed",
                progress_percent: 100,
                content_url: matched.url,
              })
              .eq("id", item.id);
            console.log(`  ✅ Found completed: ${item.id}`);
          }
        } catch {
          // Ignore errors during stuck check
        }
      }
    }
  }
}

// Entry point
async function main(): Promise<void> {
  const watchMode = process.argv.includes("--watch");

  console.log("╔══════════════════════════════════════╗");
  console.log("║   NotebookLM Queue Processor         ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Mode: ${watchMode ? "Continuous (--watch)" : "Single run"}`);
  console.log(`MCP Server: ${MCP_URL}`);
  console.log("");

  // Check MCP server health
  const healthy = await checkMCPHealth();
  if (!healthy) {
    console.error("❌ MCP server is not running or unhealthy");
    console.error("   Start it with: notebooklm-mcp --transport http --port 3456");
    process.exit(1);
  }
  console.log("✅ MCP server is healthy");

  // Initialize session
  await initMCPSession();

  if (watchMode) {
    // Run continuously
    while (true) {
      await checkStuckItems();
      await processQueue();
      console.log("\n⏰ Waiting 30 seconds...\n");
      await new Promise((r) => setTimeout(r, 30000));
    }
  } else {
    // Single run
    await checkStuckItems();
    await processQueue();
    console.log("\n✨ Done!");
  }
}

main().catch(console.error);
