/**
 * Local MCP Client - Direct browser-to-localhost connection to notebooklm-mcp server
 *
 * Usage:
 * 1. Start MCP server: notebooklm-mcp --transport http --port 3456
 * 2. The client connects directly from the browser to localhost:3456
 */

const DEFAULT_MCP_URL = "http://localhost:3456";

interface MCPToolResult {
  content?: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: MCPToolResult;
  error?: { code: number; message: string };
}

export interface LocalMCPClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface NotebookInfo {
  id: string;
  title: string;
  source_count: number;
  url: string;
}

export interface GenerationResult {
  success: boolean;
  notebook_id?: string;
  status?: string;
  url?: string;
  error?: string;
}

export interface StudioStatus {
  status: string;
  artifacts: Array<{
    type: string;
    status: string;
    url?: string;
  }>;
}

class LocalMCPClient {
  private baseUrl: string;
  private timeout: number;
  private sessionId: string | null = null;

  constructor(config: LocalMCPClientConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_MCP_URL;
    this.timeout = config.timeout || 120000;
  }

  /**
   * Check if the MCP server is running and accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Initialize MCP session (required before tool calls)
   */
  private async initSession(): Promise<string> {
    if (this.sessionId) return this.sessionId;

    const response = await fetch(`${this.baseUrl}/mcp`, {
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
          clientInfo: { name: "voicely-browser", version: "1.0" },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const sessionId = response.headers.get("mcp-session-id");
    if (!sessionId) {
      throw new Error("Failed to get MCP session ID");
    }
    this.sessionId = sessionId;
    return sessionId;
  }

  /**
   * Parse SSE response from MCP server
   */
  private parseSSEResponse(text: string): MCPResponse {
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        return JSON.parse(line.slice(6));
      }
    }
    return JSON.parse(text);
  }

  /**
   * Call an MCP tool
   */
  private async callTool<T = unknown>(
    name: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const sessionId = await this.initSession();

    const response = await fetch(`${this.baseUrl}/mcp`, {
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
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const data = this.parseSSEResponse(text);

    if (data.error) {
      throw new Error(`MCP RPC error: ${data.error.message}`);
    }

    const result = data.result;
    if (!result) {
      throw new Error("Empty MCP result");
    }

    // Parse the result
    if (result.structuredContent) {
      return result.structuredContent as T;
    }
    if (result.content?.[0]?.text) {
      try {
        return JSON.parse(result.content[0].text) as T;
      } catch {
        return { raw: result.content[0].text } as T;
      }
    }
    return {} as T;
  }

  /**
   * List all notebooks
   */
  async listNotebooks(): Promise<NotebookInfo[]> {
    const result = await this.callTool<{ notebooks: NotebookInfo[] }>(
      "notebook_list",
      {}
    );
    return result.notebooks || [];
  }

  /**
   * Create a new notebook
   */
  async createNotebook(title: string): Promise<string> {
    const result = await this.callTool<{ notebook_id: string }>(
      "notebook_create",
      { title }
    );
    if (!result.notebook_id) {
      throw new Error("Failed to create notebook");
    }
    return result.notebook_id;
  }

  /**
   * Add text source to a notebook
   */
  async addTextSource(
    notebookId: string,
    text: string,
    title: string
  ): Promise<void> {
    await this.callTool("notebook_add_text", {
      notebook_id: notebookId,
      text,
      title,
    });
  }

  /**
   * Generate audio overview (podcast)
   */
  async createAudioOverview(
    notebookId: string,
    options: {
      format?: "deep_dive" | "brief" | "critique" | "debate";
      length?: "short" | "default" | "long";
      language?: string;
      focusPrompt?: string;
    } = {}
  ): Promise<GenerationResult> {
    const result = await this.callTool<GenerationResult>(
      "audio_overview_create",
      {
        notebook_id: notebookId,
        format: options.format || "deep_dive",
        length: options.length || "default",
        language: options.language || "he",
        focus_prompt: options.focusPrompt || "",
        confirm: true,
      }
    );
    return result;
  }

  /**
   * Generate slide deck
   */
  async createSlideDeck(
    notebookId: string,
    options: {
      format?: "detailed_deck" | "presenter_slides";
      length?: "short" | "default";
      language?: string;
      focusPrompt?: string;
    } = {}
  ): Promise<GenerationResult> {
    const result = await this.callTool<GenerationResult>("slide_deck_create", {
      notebook_id: notebookId,
      format: options.format || "detailed_deck",
      length: options.length || "default",
      language: options.language || "he",
      focus_prompt: options.focusPrompt || "",
      confirm: true,
    });
    return result;
  }

  /**
   * Generate infographic
   */
  async createInfographic(
    notebookId: string,
    options: {
      orientation?: "landscape" | "portrait" | "square";
      detailLevel?: "concise" | "standard" | "detailed";
      language?: string;
      focusPrompt?: string;
    } = {}
  ): Promise<GenerationResult> {
    const result = await this.callTool<GenerationResult>("infographic_create", {
      notebook_id: notebookId,
      orientation: options.orientation || "landscape",
      detail_level: options.detailLevel || "standard",
      language: options.language || "he",
      focus_prompt: options.focusPrompt || "",
      confirm: true,
    });
    return result;
  }

  /**
   * Check studio status (for async generation)
   */
  async getStudioStatus(notebookId: string): Promise<StudioStatus> {
    const result = await this.callTool<StudioStatus>("studio_status", {
      notebook_id: notebookId,
    });
    return result;
  }

  /**
   * Query notebook with a question
   */
  async queryNotebook(
    notebookId: string,
    query: string
  ): Promise<{ answer: string }> {
    const result = await this.callTool<{ answer: string }>("notebook_query", {
      notebook_id: notebookId,
      query,
    });
    return result;
  }

  /**
   * Delete a notebook
   */
  async deleteNotebook(notebookId: string): Promise<void> {
    await this.callTool("notebook_delete", {
      notebook_id: notebookId,
      confirm: true,
    });
  }

  /**
   * Reset session (useful after errors)
   */
  resetSession(): void {
    this.sessionId = null;
  }
}

// Singleton instance
let clientInstance: LocalMCPClient | null = null;

export function getLocalMCPClient(config?: LocalMCPClientConfig): LocalMCPClient {
  if (!clientInstance || config) {
    clientInstance = new LocalMCPClient(config);
  }
  return clientInstance;
}

export { LocalMCPClient };
