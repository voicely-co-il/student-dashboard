// API Route: Process NotebookLM queue items via local MCP server
// This route connects to notebooklm-mcp running locally with --transport http
// Usage: Start MCP first: notebooklm-mcp --transport http --port 3456

import { createClient } from "@supabase/supabase-js";

const MCP_URL = process.env.NOTEBOOKLM_MCP_URL || "http://localhost:3456";

export const config = {
  runtime: "edge",
};

interface MCPToolCallResponse {
  content?: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

// Session management for MCP HTTP transport
let mcpSessionId: string | null = null;

async function initMCPSession(): Promise<string> {
  if (mcpSessionId) return mcpSessionId;

  const response = await fetch(`${MCP_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "voicely-api", version: "1.0" },
      },
    }),
  });

  const sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error("Failed to get MCP session ID");
  }
  mcpSessionId = sessionId;
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
      "Accept": "application/json, text/event-stream",
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

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Check MCP server health first
    try {
      const health = await fetch(`${MCP_URL}/health`);
      if (!health.ok) throw new Error("unhealthy");
    } catch {
      return new Response(
        JSON.stringify({
          error: "NotebookLM MCP server is not running",
          hint: "Start it with: notebooklm-mcp --transport http --port 3456",
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { action, item_id, transcript_ids, title, outputs } = body;

    // Initialize Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case "process_item": {
        // Process a single queue item
        if (!item_id) {
          return new Response(
            JSON.stringify({ error: "item_id required" }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Get the item
        const { data: item, error } = await supabase
          .from("notebooklm_content")
          .select("*")
          .eq("id", item_id)
          .single();

        if (error || !item) {
          return new Response(
            JSON.stringify({ error: "Item not found" }),
            { status: 404, headers: corsHeaders }
          );
        }

        // Mark as processing
        await supabase
          .from("notebooklm_content")
          .update({ status: "processing" })
          .eq("id", item_id);

        try {
          // Step 1: Create notebook
          const createResult = await callMCPTool("notebook_create", {
            title: item.notebook_name || item.title || "Voicely Content",
          });
          const notebookData = parseToolResult(createResult);
          const notebookId = (notebookData as { notebook_id?: string }).notebook_id;

          if (!notebookId) {
            throw new Error("Failed to create notebook: " + JSON.stringify(notebookData));
          }

          // Step 2: Add source content
          const sourceText = item.source_content || "";
          if (!sourceText) {
            throw new Error("No source content to add");
          }

          await callMCPTool("notebook_add_text", {
            notebook_id: notebookId,
            text: sourceText,
            title: item.title || "Lesson Content",
          });

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

          const genResult = await callMCPTool(generateTool, generateArgs);
          const genData = parseToolResult(genResult);

          // For questions, update answer directly
          if (item.content_type === "question") {
            await supabase
              .from("notebooklm_content")
              .update({
                status: "completed",
                answer: (genData as { answer?: string }).answer ||
                  (genData as { raw?: string }).raw ||
                  JSON.stringify(genData),
                task_id: notebookId,
              })
              .eq("id", item_id);
          } else {
            // For studio content, save notebook_id and poll later
            await supabase
              .from("notebooklm_content")
              .update({
                status: "processing",
                task_id: notebookId,
                progress_percent: 25,
              })
              .eq("id", item_id);
          }

          return new Response(
            JSON.stringify({
              success: true,
              notebook_id: notebookId,
              content_type: item.content_type,
              status: item.content_type === "question" ? "completed" : "processing",
            }),
            { headers: corsHeaders }
          );
        } catch (err) {
          // Mark as failed
          await supabase
            .from("notebooklm_content")
            .update({
              status: "failed",
              error_message: err instanceof Error ? err.message : String(err),
            })
            .eq("id", item_id);

          throw err;
        }
      }

      case "process_queue": {
        // Process all pending items
        const { data: pendingItems } = await supabase
          .from("notebooklm_content")
          .select("id, content_type, notebook_name")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (!pendingItems || pendingItems.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: "No pending items", processed: 0 }),
            { headers: corsHeaders }
          );
        }

        // Process items sequentially (to avoid rate limiting)
        const results: Array<{ id: string; status: string; error?: string }> = [];
        for (const item of pendingItems) {
          try {
            const res = await fetch(req.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "process_item", item_id: item.id }),
            });
            const data = await res.json();
            results.push({ id: item.id, status: data.success ? "ok" : "error", error: data.error });
          } catch (err) {
            results.push({
              id: item.id,
              status: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, processed: results.length, results }),
          { headers: corsHeaders }
        );
      }

      case "check_status": {
        // Poll studio status for a processing item
        if (!item_id) {
          return new Response(
            JSON.stringify({ error: "item_id required" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { data: item } = await supabase
          .from("notebooklm_content")
          .select("task_id, content_type")
          .eq("id", item_id)
          .single();

        if (!item?.task_id) {
          return new Response(
            JSON.stringify({ error: "No task_id found" }),
            { status: 404, headers: corsHeaders }
          );
        }

        const statusResult = await callMCPTool("studio_status", {
          notebook_id: item.task_id,
        });
        const statusData = parseToolResult(statusResult);

        // Check if any artifact is completed
        const artifacts = (statusData as { artifacts?: Array<{ status: string; url?: string; type: string }> }).artifacts || [];
        const matched = artifacts.find(
          (a) => a.type === (item.content_type === "podcast" ? "audio" : item.content_type)
        );

        if (matched?.status === "completed" && matched.url) {
          await supabase
            .from("notebooklm_content")
            .update({
              status: "completed",
              content_url: matched.url,
              progress_percent: 100,
            })
            .eq("id", item_id);

          return new Response(
            JSON.stringify({ success: true, status: "completed", url: matched.url }),
            { headers: corsHeaders }
          );
        }

        // Still processing
        const summary = (statusData as { summary?: { total: number; completed: number } }).summary;
        const progress = summary
          ? Math.round((summary.completed / Math.max(summary.total, 1)) * 100)
          : 50;

        await supabase
          .from("notebooklm_content")
          .update({ progress_percent: progress })
          .eq("id", item_id);

        return new Response(
          JSON.stringify({ success: true, status: "processing", progress }),
          { headers: corsHeaders }
        );
      }

      case "from_transcripts": {
        // Create content from transcript IDs
        if (!transcript_ids || transcript_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: "transcript_ids required" }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Fetch transcripts
        const { data: transcripts } = await supabase
          .from("transcripts")
          .select("id, title, full_text, student_name, lesson_date")
          .in("id", transcript_ids);

        if (!transcripts || transcripts.length === 0) {
          return new Response(
            JSON.stringify({ error: "No transcripts found" }),
            { status: 404, headers: corsHeaders }
          );
        }

        // Combine transcripts into one content
        const combinedContent = transcripts
          .map((t) => `--- ${t.title} (${t.student_name || "Unknown"}) ---\n${t.full_text}`)
          .join("\n\n");

        const contentTitle =
          title ||
          (transcripts.length === 1
            ? transcripts[0].title
            : `${transcripts.length} שיעורים - ${transcripts[0].student_name || "Mixed"}`);

        // Get admin user for created_by
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();

        const createdBy = adminRole?.user_id || transcripts[0].id;
        const requestedOutputs: string[] = outputs || ["podcast"];
        const batchId = crypto.randomUUID();
        const createdIds: string[] = [];

        for (const outputType of requestedOutputs) {
          const { data: record } = await supabase
            .from("notebooklm_content")
            .insert({
              created_by: createdBy,
              notebook_id: batchId,
              notebook_name: contentTitle,
              content_type: outputType,
              title: `${contentTitle} - ${outputType === "podcast" ? "פודקסט" : outputType === "slides" ? "מצגת" : "אינפוגרפיקה"}`,
              source_content: combinedContent,
              settings: { transcript_ids },
              status: "pending",
            })
            .select("id")
            .single();

          if (record) createdIds.push(record.id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            batch_id: batchId,
            created_ids: createdIds,
            transcript_count: transcripts.length,
            content_length: combinedContent.length,
          }),
          { headers: corsHeaders }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
