// Teacher Chat - Main Handler (Refactored)
// Total: ~100 lines (down from 1,176!)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "./_shared/types.ts";
import { classifyIntent } from "./_shared/intents.ts";
import { generateStreamingResponse, generateResponse } from "./_shared/gemini.ts";
import {
  handleCrmAddStudent,
  handleCrmSearchStudent,
  handleTranscriptSearch,
  handleCalendarAddEvent,
  handleCalendarView,
  handleLessonPlan,
  handleWebSearch,
} from "./_shared/intent-handlers.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], customSystemPrompt, stream = false } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Classify intent
    const intent = await classifyIntent(message, conversationHistory);
    console.log("Classified intent:", intent);

    // Process based on intent
    let context = "";
    let actions: any[] = [];

    switch (intent.intent) {
      case "crm_add_student":
        ({ context, actions } = await handleCrmAddStudent(intent));
        break;

      case "crm_search_student":
        ({ context, actions } = await handleCrmSearchStudent(intent));
        break;

      case "transcript_search":
        ({ context, actions } = await handleTranscriptSearch(intent, message));
        break;

      case "calendar_add_event":
        ({ context, actions } = await handleCalendarAddEvent(intent));
        break;

      case "calendar_view":
        ({ context, actions } = await handleCalendarView());
        break;

      case "lesson_plan":
        ({ context, actions } = await handleLessonPlan(intent));
        break;

      case "web_search":
        ({ context, actions } = await handleWebSearch(intent, message));
        break;

      default:
        context = "שאלה כללית או בקשה לא מזוהה.";
    }

    // Handle streaming response
    if (stream) {
      try {
        const streamResponse = await generateStreamingResponse(
          message, intent, context, conversationHistory, customSystemPrompt
        );

        const encoder = new TextEncoder();
        const metadata = { intent: intent.intent, actions: actions.length > 0 ? actions : undefined };

        const combinedStream = new ReadableStream({
          async start(controller) {
            // Send metadata first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));

            // Pipe Gemini stream
            const reader = streamResponse.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(combinedStream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (error) {
        console.error("Streaming error:", error);
        // Fall through to non-streaming
      }
    }

    // Generate non-streaming response
    const response = await generateResponse(
      message, intent, context, conversationHistory, customSystemPrompt
    );

    return new Response(
      JSON.stringify({
        response,
        intent: intent.intent,
        actions: actions.length > 0 ? actions : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Teacher chat error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
