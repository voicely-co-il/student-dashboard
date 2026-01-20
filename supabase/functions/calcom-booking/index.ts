import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION = "2024-08-13";

interface GetAvailabilityRequest {
  action: "get_availability";
  eventTypeId: number;
  startDate: string; // ISO date string
  endDate: string;
}

interface CreateBookingRequest {
  action: "create_booking";
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  start: string; // ISO datetime string
  attendee: {
    name: string;
    email: string;
    phone?: string;
    timeZone?: string;
    language?: string;
  };
  metadata?: Record<string, unknown>;
  // Optional: link to chat session
  chatSessionId?: string;
  leadId?: string;
}

interface GetEventTypesRequest {
  action: "get_event_types";
}

type CalcomRequest = GetAvailabilityRequest | CreateBookingRequest | GetEventTypesRequest;

// Call Cal.com API
async function callCalApi(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<unknown> {
  const apiKey = Deno.env.get("CALCOM_API_KEY");
  if (!apiKey) {
    throw new Error("CALCOM_API_KEY not configured");
  }

  const url = `${CAL_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": CAL_API_VERSION,
    "Content-Type": "application/json",
  };

  const options: RequestInit = { method, headers };
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  console.log(`Cal.com API call: ${method} ${url}`);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error("Cal.com API error:", data);
    throw new Error(data.message || `Cal.com API error: ${response.status}`);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: CalcomRequest = await req.json();

    switch (request.action) {
      case "get_event_types": {
        // Get all event types for the user
        const username = Deno.env.get("CALCOM_USERNAME") || "voicely";
        const data = await callCalApi(`/event-types?username=${username}`);

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_availability": {
        const { eventTypeId, startDate, endDate } = request;

        // Check cache first
        const { data: cached } = await supabase
          .from("calcom_availability_cache")
          .select("slots")
          .gte("date", startDate)
          .lte("date", endDate)
          .gt("expires_at", new Date().toISOString());

        if (cached && cached.length > 0) {
          console.log("Returning cached availability");
          return new Response(
            JSON.stringify({ success: true, slots: cached, cached: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch from Cal.com
        const data = await callCalApi(
          `/slots/available?startTime=${startDate}&endTime=${endDate}&eventTypeId=${eventTypeId}`
        );

        // Cache the results (expires in 15 minutes)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const slotsData = data as { slots?: Record<string, unknown[]> };

        if (slotsData.slots) {
          // Group slots by date and cache
          for (const [date, slots] of Object.entries(slotsData.slots)) {
            await supabase.from("calcom_availability_cache").upsert(
              {
                event_type_id: eventTypeId,
                date: date.split("T")[0],
                slots: slots,
                cached_at: new Date().toISOString(),
                expires_at: expiresAt,
              },
              { onConflict: "event_type_id,date" }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true, data, cached: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_booking": {
        const { eventTypeId, eventTypeSlug, username, start, attendee, metadata, chatSessionId, leadId } = request;

        // Build booking request
        const bookingBody: Record<string, unknown> = {
          start,
          attendee: {
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone || "Asia/Jerusalem",
            language: attendee.language || "he",
          },
        };

        // Add phone if provided
        if (attendee.phone) {
          bookingBody.attendee = {
            ...bookingBody.attendee as object,
            phoneNumber: attendee.phone,
          };
        }

        // Add event type identifier
        if (eventTypeId) {
          bookingBody.eventTypeId = eventTypeId;
        } else if (eventTypeSlug && username) {
          bookingBody.eventTypeSlug = eventTypeSlug;
          bookingBody.username = username;
        }

        // Add metadata
        if (metadata) {
          bookingBody.metadata = metadata;
        }

        // Create booking via Cal.com API
        const data = await callCalApi("/bookings", "POST", bookingBody);
        const bookingData = data as { data?: { uid?: string; id?: number } };

        // Save to our database for tracking
        if (bookingData.data?.uid) {
          const { error: dbError } = await supabase.from("calcom_bookings").insert({
            calcom_booking_id: bookingData.data.id,
            calcom_booking_uid: bookingData.data.uid,
            attendee_name: attendee.name,
            attendee_email: attendee.email,
            attendee_phone: attendee.phone,
            attendee_timezone: attendee.timeZone || "Asia/Jerusalem",
            attendee_language: attendee.language || "he",
            start_time: start,
            status: "pending",
            source: chatSessionId ? "chat" : "api",
            chat_session_id: chatSessionId || null,
            lead_id: leadId || null,
            metadata: metadata || {},
          });

          if (dbError) {
            console.error("Error saving booking to DB:", dbError);
            // Don't fail - booking was created in Cal.com
          }

          // Update lead status if provided
          if (leadId) {
            await supabase
              .from("leads")
              .update({ status: "qualified" })
              .eq("id", leadId);
          }
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Booking API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
