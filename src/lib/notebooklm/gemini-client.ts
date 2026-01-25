/**
 * Gemini Cloud Client - Direct API access to Google's Gemini for content generation
 *
 * This is an alternative to the local MCP server when you want:
 * - Cloud-based processing (no local server needed)
 * - Pay-per-use pricing (~$0.01-0.04 per generation)
 *
 * Requires: VITE_GEMINI_API_KEY environment variable
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiClientConfig {
  apiKey?: string;
}

export interface GenerationOptions {
  title: string;
  content: string;
  language?: string;
  focusPrompt?: string;
}

export interface PodcastResult {
  script: string;
  audioUrl?: string;
}

export interface SlidesResult {
  slides: Array<{
    title: string;
    content: string;
    speakerNotes?: string;
  }>;
}

export interface InfographicResult {
  imageUrl?: string;
  imageBase64?: string;
  description: string;
  keyPoints: string[];
}

class GeminiClient {
  private apiKey: string;

  constructor(config: GeminiClientConfig = {}) {
    // Try multiple env var names for flexibility
    this.apiKey = config.apiKey ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      "";
    if (!this.apiKey) {
      console.warn("GeminiClient: No API key provided. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY");
    }
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Make a request to Gemini API
   */
  private async callGemini(
    model: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const response = await fetch(
      `${GEMINI_API_URL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  /**
   * Generate a podcast script from content
   */
  async generatePodcastScript(options: GenerationOptions): Promise<PodcastResult> {
    const { title, content, language = "he", focusPrompt } = options;

    const systemPrompt = `אתה כותב תסריטים לפודקסטים חינוכיים בסגנון NotebookLM.
יש לך שני מגישים - איש ואישה - שמנהלים שיחה מרתקת ועמוקה על התוכן.
השיחה צריכה להיות:
- טבעית וזורמת, כמו שיחה אמיתית
- מעמיקה בנושאים המרכזיים
- מוסיפה תובנות ודוגמאות
- באורך של 5-10 דקות קריאה

כתוב את התסריט בפורמט:
[מגיש]: טקסט
[מגישה]: טקסט`;

    const prompt = `צור תסריט פודקסט בנושא "${title}".
${focusPrompt ? `התמקד ב: ${focusPrompt}` : ""}

התוכן המקורי:
${content}

כתוב תסריט ב${language === "he" ? "עברית" : "אנגלית"}.`;

    const script = await this.callGemini(
      "gemini-2.0-flash",
      prompt,
      systemPrompt
    );

    return { script };
  }

  /**
   * Generate slide deck content
   */
  async generateSlides(options: GenerationOptions): Promise<SlidesResult> {
    const { title, content, language = "he", focusPrompt } = options;

    const systemPrompt = `אתה מעצב מצגות מקצועיות.
צור מצגת עם 8-12 שקפים שמסכמים את התוכן בצורה ברורה וויזואלית.
כל שקף צריך:
- כותרת קצרה וקולעת
- 3-5 נקודות מפתח
- הערות למציג (מה להגיד)

החזר JSON בפורמט:
{
  "slides": [
    { "title": "כותרת", "content": "נקודות מפתח", "speakerNotes": "הערות" }
  ]
}`;

    const prompt = `צור מצגת בנושא "${title}".
${focusPrompt ? `התמקד ב: ${focusPrompt}` : ""}

התוכן:
${content}

צור את המצגת ב${language === "he" ? "עברית" : "אנגלית"}.
החזר רק JSON תקין.`;

    const response = await this.callGemini(
      "gemini-2.0-flash",
      prompt,
      systemPrompt
    );

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse slides JSON:", e);
    }

    // Fallback: parse as text
    return {
      slides: [
        {
          title,
          content: response,
        },
      ],
    };
  }

  /**
   * Generate infographic description and key points
   */
  async generateInfographicContent(
    options: GenerationOptions
  ): Promise<InfographicResult> {
    const { title, content, language = "he", focusPrompt } = options;

    const systemPrompt = `אתה מעצב אינפוגרפיקות מקצועיות.
תפקידך לחלץ את המידע החשוב ביותר ולארגן אותו בצורה ויזואלית.

החזר JSON בפורמט:
{
  "description": "תיאור קצר של האינפוגרפיקה",
  "keyPoints": ["נקודה 1", "נקודה 2", ...],
  "sections": [
    { "title": "כותרת", "items": ["פריט 1", "פריט 2"] }
  ],
  "stats": [
    { "value": "85%", "label": "תווית" }
  ]
}`;

    const prompt = `צור תוכן לאינפוגרפיקה בנושא "${title}".
${focusPrompt ? `התמקד ב: ${focusPrompt}` : ""}

התוכן:
${content}

צור ב${language === "he" ? "עברית" : "אנגלית"}.
החזר רק JSON תקין.`;

    const response = await this.callGemini(
      "gemini-2.0-flash",
      prompt,
      systemPrompt
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          description: parsed.description || title,
          keyPoints: parsed.keyPoints || [],
          ...parsed,
        };
      }
    } catch (e) {
      console.error("Failed to parse infographic JSON:", e);
    }

    return {
      description: title,
      keyPoints: [content.slice(0, 200)],
    };
  }

  /**
   * Generate infographic image using Gemini's image generation
   * Note: Requires Imagen API access
   */
  async generateInfographicImage(
    description: string,
    keyPoints: string[]
  ): Promise<string | null> {
    // Gemini Image Generation requires Vertex AI or special access
    // For now, return null - can be implemented with Imagen API later
    console.log("Image generation not yet implemented for Gemini client");
    return null;
  }

  /**
   * Answer a question about content
   */
  async answerQuestion(content: string, question: string): Promise<string> {
    const systemPrompt = `אתה עוזר חכם שעונה על שאלות בהתבסס על תוכן שניתן לך.
ענה בצורה מדויקת, ברורה ותמציתית.
אם התשובה לא נמצאת בתוכן, אמור זאת בבירור.`;

    const prompt = `בהתבסס על התוכן הבא:
${content}

ענה על השאלה: ${question}`;

    return await this.callGemini("gemini-2.0-flash", prompt, systemPrompt);
  }
}

// Singleton instance
let clientInstance: GeminiClient | null = null;

export function getGeminiClient(config?: GeminiClientConfig): GeminiClient {
  if (!clientInstance || config) {
    clientInstance = new GeminiClient(config);
  }
  return clientInstance;
}

export { GeminiClient };
