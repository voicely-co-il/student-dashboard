// Google Calendar operations
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import type { CalendarEvent } from "./types.ts";

// Voicely Calendar IDs - mapped by lesson type
const VOICELY_CALENDARS = {
  one_on_one: "9e88f9bf71cfa6dc0ec7689c08ef80684430a12ed1a6aa09fb1befdf1968ae24@group.calendar.google.com",
  group: "14009a9db57855b9eedf4d203624fab11690206bfef925334299e7b512244a29@group.calendar.google.com",
  trial: "234bb6ad3c294ac2047bfd3b91c1a4c73b6245c81409b6592b7de448759e3395@group.calendar.google.com",
  alternating: "095603f9667854e40fd1e6c547ad4a91f30014bae8e9ab517759e1afa4cf910c@group.calendar.google.com",
} as const;

// Calendar display names
const CALENDAR_NAMES: Record<string, string> = {
  one_on_one: "1:1 Voicely",
  group: "קבוצות",
  trial: "שיעורי ניסיון",
  alternating: "לומד 1:1 לסירוגין",
};

// Get OAuth token using Service Account
async function getGoogleAccessToken(): Promise<string | null> {
  const serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!serviceEmail || !privateKey) {
    console.error("Missing Google Service Account credentials");
    return null;
  }

  try {
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const base64UrlEncode = (obj: object) => {
      const json = JSON.stringify(obj);
      const encoded = encodeBase64(new TextEncoder().encode(json));
      return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    };

    const headerB64 = base64UrlEncode(header);
    const claimSetB64 = base64UrlEncode(claimSet);
    const signatureInput = `${headerB64}.${claimSetB64}`;

    const pemContents = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
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

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return null;
  }
}

export async function getCalendarEvents(days = 7): Promise<CalendarEvent[]> {
  const accessToken = await getGoogleAccessToken();
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";

  if (!accessToken) {
    return [];
  }

  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=20`,
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
    }));
  } catch (error) {
    console.error("Get calendar events error:", error);
    return [];
  }
}

export async function createCalendarEvent(
  title: string,
  startTime: string,
  endTime: string,
  description?: string,
  lessonType?: string
): Promise<{ success: boolean; eventId?: string; calendarName?: string; error?: string }> {
  const accessToken = await getGoogleAccessToken();

  // Select calendar based on lesson type
  let calendarId: string;
  let calendarName: string;

  switch (lessonType) {
    case "trial":
      calendarId = VOICELY_CALENDARS.trial;
      calendarName = CALENDAR_NAMES.trial;
      break;
    case "group":
      calendarId = VOICELY_CALENDARS.group;
      calendarName = CALENDAR_NAMES.group;
      break;
    case "alternating":
      calendarId = VOICELY_CALENDARS.alternating;
      calendarName = CALENDAR_NAMES.alternating;
      break;
    case "one_on_one":
    default:
      calendarId = VOICELY_CALENDARS.one_on_one;
      calendarName = CALENDAR_NAMES.one_on_one;
      break;
  }

  if (!accessToken) {
    return { success: false, error: "Failed to authenticate with Google" };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description: description || "",
          start: { dateTime: startTime, timeZone: "Asia/Jerusalem" },
          end: { dateTime: endTime, timeZone: "Asia/Jerusalem" },
        }),
      }
    );

    const data = await response.json();

    if (data.id) {
      return { success: true, eventId: data.id, calendarName };
    } else {
      return { success: false, error: data.error?.message || "Failed to create event" };
    }
  } catch (error) {
    console.error("Create calendar event error:", error);
    return { success: false, error: String(error) };
  }
}

// Parse Hebrew date/time to ISO format
export function parseHebrewDateTime(
  dateStr?: string,
  timeStr?: string
): { startTime: string; endTime: string } | null {
  const now = new Date();
  let targetDate = new Date(now);

  if (dateStr) {
    const lowerDate = dateStr.toLowerCase();
    if (lowerDate === "היום" || lowerDate === "today") {
      // Already set to today
    } else if (lowerDate === "מחר" || lowerDate === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lowerDate.includes("יום")) {
      const days: Record<string, number> = {
        "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3,
        "חמישי": 4, "שישי": 5, "שבת": 6,
      };
      for (const [name, dayNum] of Object.entries(days)) {
        if (lowerDate.includes(name)) {
          const currentDay = now.getDay();
          let daysUntil = dayNum - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          targetDate.setDate(targetDate.getDate() + daysUntil);
          break;
        }
      }
    } else {
      const match = dateStr.match(/(\d{1,2})[\/\.](\d{1,2})/);
      if (match) {
        targetDate.setDate(parseInt(match[1]));
        targetDate.setMonth(parseInt(match[2]) - 1);
      }
    }
  }

  let hour = 10;
  let minute = 0;
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    }
  }

  targetDate.setHours(hour, minute, 0, 0);
  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);

  return {
    startTime: targetDate.toISOString(),
    endTime: endDate.toISOString(),
  };
}
