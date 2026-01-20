import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cal-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cal.com Webhook Event Types
type CalWebhookEvent =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_REJECTED"
  | "BOOKING_REQUESTED"
  | "BOOKING_PAYMENT_INITIATED"
  | "BOOKING_PAID";

interface CalWebhookPayload {
  triggerEvent: CalWebhookEvent;
  createdAt: string;
  payload: {
    // Booking details
    uid: string;
    bookingId: number;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    status: string;

    // Event type
    eventTypeId: number;
    eventTitle: string;
    length: number;

    // Attendee
    attendees: Array<{
      email: string;
      name: string;
      timeZone: string;
      language: string;
      phone?: string;
    }>;

    // Organizer (teacher)
    organizer: {
      email: string;
      name: string;
      timeZone: string;
    };

    // Location
    location?: string;
    videoCallUrl?: string;

    // Cancellation
    cancellationReason?: string;

    // Metadata
    metadata?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const webhookData: CalWebhookPayload = await req.json();
    const { triggerEvent, payload } = webhookData;

    console.log(`Cal.com webhook received: ${triggerEvent}`, payload.uid);

    // Get attendee info
    const attendee = payload.attendees?.[0];
    if (!attendee) {
      console.error("No attendee in webhook payload");
      return new Response(JSON.stringify({ error: "No attendee" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Cal.com event to our status
    const statusMap: Record<CalWebhookEvent, string> = {
      BOOKING_CREATED: "pending",
      BOOKING_REQUESTED: "pending",
      BOOKING_CONFIRMED: "accepted",
      BOOKING_CANCELLED: "cancelled",
      BOOKING_REJECTED: "rejected",
      BOOKING_RESCHEDULED: "rescheduled",
      BOOKING_PAYMENT_INITIATED: "pending",
      BOOKING_PAID: "accepted",
    };

    const bookingStatus = statusMap[triggerEvent] || "pending";

    // Prepare booking record
    const bookingRecord = {
      calcom_booking_id: payload.bookingId,
      calcom_booking_uid: payload.uid,
      attendee_name: attendee.name,
      attendee_email: attendee.email,
      attendee_phone: attendee.phone || null,
      attendee_timezone: attendee.timeZone,
      attendee_language: attendee.language,
      start_time: payload.startTime,
      end_time: payload.endTime,
      status: bookingStatus,
      meeting_url: payload.videoCallUrl || null,
      location_type: payload.location || null,
      cancellation_reason: payload.cancellationReason || null,
      metadata: payload.metadata || {},
      booking_fields_responses: payload.responses || {},
      updated_at: new Date().toISOString(),
    };

    // Handle different events
    switch (triggerEvent) {
      case "BOOKING_CREATED":
      case "BOOKING_REQUESTED":
        // Insert new booking
        const { error: insertError } = await supabase
          .from("calcom_bookings")
          .upsert({
            ...bookingRecord,
            created_at: new Date().toISOString(),
          }, {
            onConflict: "calcom_booking_uid",
          });

        if (insertError) {
          console.error("Error inserting booking:", insertError);
          throw insertError;
        }

        // Try to link to existing lead by email or phone
        if (attendee.email || attendee.phone) {
          const { data: lead } = await supabase
            .from("leads")
            .select("id, chat_session_id")
            .or(`email.eq.${attendee.email},phone.eq.${attendee.phone}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (lead) {
            await supabase
              .from("calcom_bookings")
              .update({
                lead_id: lead.id,
                chat_session_id: lead.chat_session_id,
                source: "chat",
              })
              .eq("calcom_booking_uid", payload.uid);

            // Update lead status to qualified (they booked!)
            await supabase
              .from("leads")
              .update({ status: "qualified" })
              .eq("id", lead.id);

            console.log(`Linked booking to lead: ${lead.id}`);
          }
        }

        console.log(`Booking created: ${payload.uid}`);
        break;

      case "BOOKING_CONFIRMED":
        await supabase
          .from("calcom_bookings")
          .update({
            status: "accepted",
            confirmed_at: new Date().toISOString(),
          })
          .eq("calcom_booking_uid", payload.uid);

        console.log(`Booking confirmed: ${payload.uid}`);
        break;

      case "BOOKING_CANCELLED":
        await supabase
          .from("calcom_bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: payload.cancellationReason || null,
          })
          .eq("calcom_booking_uid", payload.uid);

        console.log(`Booking cancelled: ${payload.uid}`);
        break;

      case "BOOKING_RESCHEDULED":
        await supabase
          .from("calcom_bookings")
          .update({
            status: "rescheduled",
            start_time: payload.startTime,
            end_time: payload.endTime,
          })
          .eq("calcom_booking_uid", payload.uid);

        console.log(`Booking rescheduled: ${payload.uid}`);
        break;

      case "BOOKING_REJECTED":
        await supabase
          .from("calcom_bookings")
          .update({ status: "rejected" })
          .eq("calcom_booking_uid", payload.uid);

        console.log(`Booking rejected: ${payload.uid}`);
        break;

      default:
        console.log(`Unhandled event type: ${triggerEvent}`);
    }

    return new Response(
      JSON.stringify({ success: true, event: triggerEvent, uid: payload.uid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
