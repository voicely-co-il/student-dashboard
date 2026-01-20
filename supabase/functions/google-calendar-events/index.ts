import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Google Calendar: Get OAuth token using Service Account
async function getGoogleAccessToken(): Promise<string | null> {
  const serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!serviceEmail || !privateKey) {
    console.error("Missing Google Service Account credentials");
    return null;
  }

  try {
    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    // Create JWT claim set
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceEmail,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Base64url encode
    const base64UrlEncode = (obj: object) => {
      const json = JSON.stringify(obj);
      const encoded = encodeBase64(new TextEncoder().encode(json));
      return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    };

    const headerB64 = base64UrlEncode(header);
    const claimSetB64 = base64UrlEncode(claimSet);
    const signatureInput = `${headerB64}.${claimSetB64}`;

    // Import private key and sign
    const pemContents = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\\n/g, "")
      .replace(/\n/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const signatureB64 = encodeBase64(new Uint8Array(signature))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jwt = `${signatureInput}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Google OAuth error:", tokenData);
      return null;
    }

    return tokenData.access_token || null;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return null;
  }
}

// Get events from Google Calendar
async function getCalendarEvents(
  timeMin: string,
  timeMax: string,
  maxResults = 50
): Promise<any[]> {
  const accessToken = await getGoogleAccessToken();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

  if (!accessToken) {
    console.error("Failed to get Google access token");
    return [];
  }

  try {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(maxResults),
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Calendar API error:", data.error);
      return [];
    }

    return (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "ללא כותרת",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
      location: event.location,
      status: event.status,
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        responseStatus: a.responseStatus,
      })),
    }));
  } catch (error) {
    console.error("Get calendar events error:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get query parameters or body
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (req.method === "POST") {
      const body = await req.json();
      startDate = body.startDate;
      endDate = body.endDate;
    } else {
      const url = new URL(req.url);
      startDate = url.searchParams.get("startDate") || undefined;
      endDate = url.searchParams.get("endDate") || undefined;
    }

    // Default to today and end of week
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // End of week (next Sunday)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const timeMin = startDate
      ? new Date(startDate).toISOString()
      : today.toISOString();

    const timeMax = endDate
      ? new Date(endDate + "T23:59:59").toISOString()
      : endOfWeek.toISOString();

    console.log(`Fetching events from ${timeMin} to ${timeMax}`);

    const events = await getCalendarEvents(timeMin, timeMax);

    // Calculate stats
    const todayStr = today.toISOString().split("T")[0];
    const todayEvents = events.filter((e) => {
      const eventDate = new Date(e.start).toISOString().split("T")[0];
      return eventDate === todayStr;
    });

    // Find next upcoming event
    const upcomingEvents = events
      .filter((e) => new Date(e.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const nextLesson = upcomingEvents[0] || null;

    return new Response(
      JSON.stringify({
        success: true,
        events,
        count: events.length,
        todayCount: todayEvents.length,
        todayEvents,
        weekCount: events.length,
        nextLesson,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
