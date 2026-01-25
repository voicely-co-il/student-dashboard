/**
 * NotebookLM Unified Client
 *
 * Provides a unified interface for content generation with two backends:
 * 1. Local MCP - Uses notebooklm-mcp server running locally (free, requires setup)
 * 2. Gemini Cloud - Uses Google's Gemini API directly (pay-per-use, no setup)
 */

import { getLocalMCPClient, LocalMCPClient } from "./local-mcp-client";
import { getGeminiClient, GeminiClient } from "./gemini-client";

export type BackendMode = "local" | "cloud" | "auto";

export interface NotebookLMSettings {
  mode: BackendMode;
  localMcpUrl?: string;
  geminiApiKey?: string;
}

export interface ContentGenerationRequest {
  title: string;
  content: string;
  outputs: Array<"podcast" | "slides" | "infographic">;
  question?: string;
  language?: string;
  focusPrompt?: string;
}

export interface ContentGenerationResult {
  type: "podcast" | "slides" | "infographic" | "question";
  status: "pending" | "processing" | "completed" | "failed";
  data?: unknown;
  url?: string;
  error?: string;
}

export interface BackendStatus {
  mode: BackendMode;
  localAvailable: boolean;
  cloudAvailable: boolean;
  activeBackend: "local" | "cloud" | null;
}

const SETTINGS_KEY = "notebooklm_settings";

class NotebookLMUnifiedClient {
  private settings: NotebookLMSettings;
  private localClient: LocalMCPClient;
  private cloudClient: GeminiClient;

  constructor() {
    this.settings = this.loadSettings();
    this.localClient = getLocalMCPClient({
      baseUrl: this.settings.localMcpUrl,
    });
    this.cloudClient = getGeminiClient({
      apiKey: this.settings.geminiApiKey,
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): NotebookLMSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load NotebookLM settings:", e);
    }
    return { mode: "auto" };
  }

  /**
   * Save settings to localStorage
   */
  saveSettings(settings: Partial<NotebookLMSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));

    // Reinitialize clients if needed
    if (settings.localMcpUrl) {
      this.localClient = getLocalMCPClient({ baseUrl: settings.localMcpUrl });
    }
    if (settings.geminiApiKey) {
      this.cloudClient = getGeminiClient({ apiKey: settings.geminiApiKey });
    }
  }

  /**
   * Get current settings
   */
  getSettings(): NotebookLMSettings {
    return { ...this.settings };
  }

  /**
   * Check backend availability and determine which to use
   */
  async getBackendStatus(): Promise<BackendStatus> {
    const [localAvailable, cloudAvailable] = await Promise.all([
      this.localClient.checkHealth().catch(() => false),
      Promise.resolve(this.cloudClient.isConfigured()),
    ]);

    let activeBackend: "local" | "cloud" | null = null;

    switch (this.settings.mode) {
      case "local":
        activeBackend = localAvailable ? "local" : null;
        break;
      case "cloud":
        activeBackend = cloudAvailable ? "cloud" : null;
        break;
      case "auto":
      default:
        // Prefer local if available, otherwise cloud
        if (localAvailable) {
          activeBackend = "local";
        } else if (cloudAvailable) {
          activeBackend = "cloud";
        }
        break;
    }

    return {
      mode: this.settings.mode,
      localAvailable,
      cloudAvailable,
      activeBackend,
    };
  }

  /**
   * Generate content using the active backend
   */
  async generateContent(
    request: ContentGenerationRequest,
    onProgress?: (result: ContentGenerationResult) => void
  ): Promise<ContentGenerationResult[]> {
    const status = await this.getBackendStatus();

    if (!status.activeBackend) {
      throw new Error(
        status.mode === "local"
          ? "שרת MCP מקומי לא זמין. הפעל: notebooklm-mcp --transport http --port 3456"
          : status.mode === "cloud"
          ? "Gemini API לא מוגדר. הוסף VITE_GEMINI_API_KEY"
          : "אין backend זמין. הפעל שרת מקומי או הגדר Gemini API key"
      );
    }

    if (status.activeBackend === "local") {
      return this.generateWithLocal(request, onProgress);
    } else {
      return this.generateWithCloud(request, onProgress);
    }
  }

  /**
   * Generate using local MCP server
   */
  private async generateWithLocal(
    request: ContentGenerationRequest,
    onProgress?: (result: ContentGenerationResult) => void
  ): Promise<ContentGenerationResult[]> {
    const results: ContentGenerationResult[] = [];

    // Create notebook
    const notebookId = await this.localClient.createNotebook(request.title);

    // Add source content
    await this.localClient.addTextSource(
      notebookId,
      request.content,
      request.title
    );

    // Generate each output type
    for (const output of request.outputs) {
      const result: ContentGenerationResult = {
        type: output,
        status: "processing",
      };

      onProgress?.(result);

      try {
        switch (output) {
          case "podcast":
            await this.localClient.createAudioOverview(notebookId, {
              language: request.language || "he",
              focusPrompt: request.focusPrompt,
            });
            break;
          case "slides":
            await this.localClient.createSlideDeck(notebookId, {
              language: request.language || "he",
              focusPrompt: request.focusPrompt,
            });
            break;
          case "infographic":
            await this.localClient.createInfographic(notebookId, {
              language: request.language || "he",
              focusPrompt: request.focusPrompt,
            });
            break;
        }

        result.status = "processing";
        result.data = { notebook_id: notebookId };
      } catch (e) {
        result.status = "failed";
        result.error = e instanceof Error ? e.message : String(e);
      }

      results.push(result);
      onProgress?.(result);
    }

    // Handle question if provided
    if (request.question) {
      const questionResult: ContentGenerationResult = {
        type: "question",
        status: "processing",
      };
      onProgress?.(questionResult);

      try {
        const answer = await this.localClient.queryNotebook(
          notebookId,
          request.question
        );
        questionResult.status = "completed";
        questionResult.data = answer;
      } catch (e) {
        questionResult.status = "failed";
        questionResult.error = e instanceof Error ? e.message : String(e);
      }

      results.push(questionResult);
      onProgress?.(questionResult);
    }

    return results;
  }

  /**
   * Generate using Gemini Cloud API
   */
  private async generateWithCloud(
    request: ContentGenerationRequest,
    onProgress?: (result: ContentGenerationResult) => void
  ): Promise<ContentGenerationResult[]> {
    const results: ContentGenerationResult[] = [];
    const generationOptions = {
      title: request.title,
      content: request.content,
      language: request.language || "he",
      focusPrompt: request.focusPrompt,
    };

    for (const output of request.outputs) {
      const result: ContentGenerationResult = {
        type: output,
        status: "processing",
      };

      onProgress?.(result);

      try {
        switch (output) {
          case "podcast": {
            const podcast = await this.cloudClient.generatePodcastScript(
              generationOptions
            );
            result.status = "completed";
            result.data = podcast;
            break;
          }
          case "slides": {
            const slides = await this.cloudClient.generateSlides(
              generationOptions
            );
            result.status = "completed";
            result.data = slides;
            break;
          }
          case "infographic": {
            const infographic = await this.cloudClient.generateInfographicContent(
              generationOptions
            );
            result.status = "completed";
            result.data = infographic;
            break;
          }
        }
      } catch (e) {
        result.status = "failed";
        result.error = e instanceof Error ? e.message : String(e);
      }

      results.push(result);
      onProgress?.(result);
    }

    // Handle question if provided
    if (request.question) {
      const questionResult: ContentGenerationResult = {
        type: "question",
        status: "processing",
      };
      onProgress?.(questionResult);

      try {
        const answer = await this.cloudClient.answerQuestion(
          request.content,
          request.question
        );
        questionResult.status = "completed";
        questionResult.data = { answer };
      } catch (e) {
        questionResult.status = "failed";
        questionResult.error = e instanceof Error ? e.message : String(e);
      }

      results.push(questionResult);
      onProgress?.(questionResult);
    }

    return results;
  }

  /**
   * Poll for studio status (local MCP only)
   */
  async pollStudioStatus(notebookId: string): Promise<{
    completed: boolean;
    artifacts: Array<{ type: string; status: string; url?: string }>;
  }> {
    const status = await this.localClient.getStudioStatus(notebookId);
    const completed = status.artifacts.every(
      (a) => a.status === "completed" || a.status === "failed"
    );
    return { completed, artifacts: status.artifacts };
  }
}

// Singleton instance
let unifiedClient: NotebookLMUnifiedClient | null = null;

export function getNotebookLMClient(): NotebookLMUnifiedClient {
  if (!unifiedClient) {
    unifiedClient = new NotebookLMUnifiedClient();
  }
  return unifiedClient;
}

// Re-export types
export type { LocalMCPClient } from "./local-mcp-client";
export type { GeminiClient } from "./gemini-client";
