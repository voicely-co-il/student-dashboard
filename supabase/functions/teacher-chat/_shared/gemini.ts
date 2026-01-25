// Gemini response generation (streaming and non-streaming)
import type { ClassifiedIntent, ConversationMessage } from "./types.ts";
import { SYSTEM_PROMPT } from "./types.ts";

// Build Gemini contents for both streaming and non-streaming
function buildGeminiContents(
  message: string,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
) {
  const conversationParts = history.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const contextInstruction = context.startsWith("✅")
    ? `חשוב מאוד: ${context}`
    : `[קונטקסט: ${context}]`;

  conversationParts.push({
    role: "user",
    parts: [{ text: `${message}\n\n${contextInstruction}` }],
  });

  const finalSystemPrompt = customSystemPrompt
    ? `${SYSTEM_PROMPT}\n\n--- הנחיות נוספות מהפרויקט ---\n${customSystemPrompt}`
    : SYSTEM_PROMPT;

  return [
    { role: "user", parts: [{ text: finalSystemPrompt + "\n\nענה בעברית." }] },
    { role: "model", parts: [{ text: "הבנתי, אני מוכן לעזור." }] },
    ...conversationParts,
  ];
}

// Generate streaming response
export async function generateStreamingResponse(
  message: string,
  _intent: ClassifiedIntent,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
): Promise<ReadableStream> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const allContents = buildGeminiContents(message, context, history, customSystemPrompt);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: allContents,
        generationConfig: { maxOutputTokens: 2000 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini streaming error:", error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr && jsonStr !== "[DONE]") {
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch (_e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error) {
        console.error("Stream processing error:", error);
        controller.error(error);
      }
    },
  });
}

// Generate non-streaming response
export async function generateResponse(
  message: string,
  _intent: ClassifiedIntent,
  context: string,
  history: ConversationMessage[],
  customSystemPrompt?: string
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const allContents = buildGeminiContents(message, context, history, customSystemPrompt);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: allContents,
          generationConfig: { maxOutputTokens: 2000 },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return `מצטער, יש בעיה עם ה-API: ${data.error.message || JSON.stringify(data.error)}`;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "מצטער, לא הצלחתי לעבד את הבקשה.";
  } catch (error) {
    console.error("Response generation error:", error);
    return "מצטער, נתקלתי בבעיה טכנית.";
  }
}
