import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

interface SendTextRequest {
  action: "send_text";
  to: string; // Phone number with country code
  message: string;
  chatSessionId?: string;
}

interface SendTemplateRequest {
  action: "send_template";
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{
      type: "text" | "image" | "document";
      text?: string;
      image?: { link: string };
    }>;
  }>;
  chatSessionId?: string;
}

interface SendInteractiveRequest {
  action: "send_interactive";
  to: string;
  type: "button" | "list";
  header?: { type: "text"; text: string };
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  chatSessionId?: string;
}

type SendWhatsAppRequest = SendTextRequest | SendTemplateRequest | SendInteractiveRequest;

// Send message via WhatsApp Cloud API
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      ...payload,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error:", data);
    return {
      success: false,
      error: data.error?.message || `API error: ${response.status}`,
    };
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;

    if (!phoneNumberId || !accessToken) {
      throw new Error("WhatsApp credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: SendWhatsAppRequest = await req.json();

    let payload: Record<string, unknown>;
    let messageContent: string;

    switch (request.action) {
      case "send_text": {
        payload = {
          recipient_type: "individual",
          to: request.to,
          type: "text",
          text: { body: request.message },
        };
        messageContent = request.message;
        break;
      }

      case "send_template": {
        payload = {
          recipient_type: "individual",
          to: request.to,
          type: "template",
          template: {
            name: request.templateName,
            language: { code: request.languageCode || "he" },
            components: request.components || [],
          },
        };
        messageContent = `[Template: ${request.templateName}]`;
        break;
      }

      case "send_interactive": {
        const interactive: Record<string, unknown> = {
          type: request.type,
          body: { text: request.body },
        };

        if (request.header) {
          interactive.header = request.header;
        }

        if (request.footer) {
          interactive.footer = { text: request.footer };
        }

        if (request.type === "button" && request.buttons) {
          interactive.action = {
            buttons: request.buttons.map((btn) => ({
              type: "reply",
              reply: { id: btn.id, title: btn.title },
            })),
          };
        } else if (request.type === "list" && request.sections) {
          interactive.action = {
            button: "בחר אפשרות",
            sections: request.sections,
          };
        }

        payload = {
          recipient_type: "individual",
          to: request.to,
          type: "interactive",
          interactive,
        };
        messageContent = request.body;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Send the message
    const result = await sendWhatsAppMessage(phoneNumberId, accessToken, payload);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find conversation and save outbound message
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id, chat_session_id")
      .eq("wa_phone_number", request.to)
      .eq("status", "active")
      .single();

    if (conversation) {
      // Save WhatsApp message record
      await supabase.from("whatsapp_messages").insert({
        wa_message_id: result.messageId,
        conversation_id: conversation.id,
        direction: "outbound",
        message_type: request.action === "send_text" ? "text" : request.action === "send_template" ? "template" : "interactive",
        content: payload,
        status: "sent",
      });

      // Add to chat session messages
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("messages")
        .eq("id", conversation.chat_session_id)
        .single();

      const updatedMessages = [
        ...(session?.messages || []),
        {
          role: "agent",
          content: messageContent,
          timestamp: new Date().toISOString(),
          source: "whatsapp",
          wa_message_id: result.messageId,
        },
      ];

      await supabase
        .from("chat_sessions")
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
          is_live: true, // Mark as live since agent is responding
        })
        .eq("id", conversation.chat_session_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        conversationId: conversation?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
