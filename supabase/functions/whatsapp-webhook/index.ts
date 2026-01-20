import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// WhatsApp Cloud API Message Types
interface WhatsAppTextMessage {
  type: "text";
  text: { body: string };
}

interface WhatsAppAudioMessage {
  type: "audio";
  audio: { id: string; mime_type: string };
}

interface WhatsAppImageMessage {
  type: "image";
  image: { id: string; mime_type: string; caption?: string };
}

interface WhatsAppInteractiveMessage {
  type: "interactive";
  interactive: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

type WhatsAppMessage = WhatsAppTextMessage | WhatsAppAudioMessage | WhatsAppImageMessage | WhatsAppInteractiveMessage;

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: "whatsapp";
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
      } & WhatsAppMessage>;
      statuses?: Array<{
        id: string;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        recipient_id: string;
        errors?: Array<{ code: number; title: string }>;
      }>;
    };
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: WhatsAppWebhookEntry[];
}

// Verify webhook signature from Meta
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `sha256=${expectedSignature}` === signature;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // Handle incoming messages (POST)
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (appSecret) {
      const signature = req.headers.get("x-hub-signature-256") || "";
      if (!verifySignature(rawBody, signature, appSecret)) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(rawBody);

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages && value.contacts) {
          for (const message of value.messages) {
            const contact = value.contacts.find((c) => c.wa_id === message.from);
            const phoneNumber = message.from;
            const profileName = contact?.profile?.name || phoneNumber;

            console.log(`WhatsApp message from ${profileName} (${phoneNumber}): ${message.type}`);

            // Extract message content based on type
            let messageContent = "";
            let messageType = message.type;

            if (message.type === "text" && "text" in message) {
              messageContent = message.text.body;
            } else if (message.type === "audio" && "audio" in message) {
              messageContent = "[הודעה קולית]";
              // TODO: Download and transcribe audio
            } else if (message.type === "image" && "image" in message) {
              messageContent = message.image.caption || "[תמונה]";
            } else if (message.type === "interactive" && "interactive" in message) {
              const interactive = message.interactive;
              messageContent = interactive.button_reply?.title || interactive.list_reply?.title || "[אינטראקציה]";
            }

            // Find or create conversation
            let { data: conversation } = await supabase
              .from("whatsapp_conversations")
              .select("id, chat_session_id")
              .eq("wa_phone_number", phoneNumber)
              .eq("status", "active")
              .single();

            let chatSessionId: string;

            if (!conversation) {
              // Create new chat session
              const { data: newSession, error: sessionError } = await supabase
                .from("chat_sessions")
                .insert({
                  visitor_info: {
                    name: profileName,
                    phone: phoneNumber,
                    source: "whatsapp",
                  },
                  messages: [],
                  source: "whatsapp",
                  status: "active",
                })
                .select("id")
                .single();

              if (sessionError) {
                console.error("Error creating chat session:", sessionError);
                continue;
              }

              chatSessionId = newSession.id;

              // Get WhatsApp account
              const { data: waAccount } = await supabase
                .from("whatsapp_accounts")
                .select("id")
                .eq("phone_number_id", value.metadata.phone_number_id)
                .single();

              // Create WhatsApp conversation
              const { data: newConversation, error: convError } = await supabase
                .from("whatsapp_conversations")
                .insert({
                  wa_phone_number: phoneNumber,
                  wa_profile_name: profileName,
                  chat_session_id: chatSessionId,
                  whatsapp_account_id: waAccount?.id,
                  status: "active",
                  last_customer_message_at: new Date().toISOString(),
                  window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                })
                .select("id")
                .single();

              if (convError) {
                console.error("Error creating conversation:", convError);
                continue;
              }

              conversation = { id: newConversation.id, chat_session_id: chatSessionId };

              // Create lead from WhatsApp contact
              await supabase.from("leads").insert({
                name: profileName,
                phone: phoneNumber,
                source: "whatsapp",
                chat_session_id: chatSessionId,
                status: "new",
                metadata: { channel: "whatsapp" },
              });
            } else {
              chatSessionId = conversation.chat_session_id;

              // Update 24-hour window
              await supabase
                .from("whatsapp_conversations")
                .update({
                  last_customer_message_at: new Date().toISOString(),
                  window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq("id", conversation.id);
            }

            // Save WhatsApp message
            await supabase.from("whatsapp_messages").insert({
              wa_message_id: message.id,
              conversation_id: conversation.id,
              direction: "inbound",
              message_type: messageType,
              content: { body: messageContent, original_type: message.type },
              status: "delivered",
              wa_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
            });

            // Add message to chat session
            const { data: session } = await supabase
              .from("chat_sessions")
              .select("messages")
              .eq("id", chatSessionId)
              .single();

            const updatedMessages = [
              ...(session?.messages || []),
              {
                role: "user",
                content: messageContent,
                timestamp: new Date().toISOString(),
                source: "whatsapp",
                wa_message_id: message.id,
              },
            ];

            await supabase
              .from("chat_sessions")
              .update({
                messages: updatedMessages,
                last_message_at: new Date().toISOString(),
              })
              .eq("id", chatSessionId);

            // TODO: Trigger AI response or notify live agent
            console.log(`Message saved to session ${chatSessionId}`);
          }
        }

        // Handle message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await supabase
              .from("whatsapp_messages")
              .update({
                status: status.status,
                status_updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
                error_code: status.errors?.[0]?.code?.toString(),
                error_message: status.errors?.[0]?.title,
              })
              .eq("wa_message_id", status.id);

            console.log(`Message ${status.id} status: ${status.status}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
