import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SONIOX_API_KEY = Deno.env.get("SONIOX_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SONIOX_API_KEY) {
      throw new Error("SONIOX_API_KEY not configured");
    }

    // Get temporary token from Soniox
    // Note: Soniox uses the API key directly for WebSocket connections
    // For production, you'd want to use their token endpoint for short-lived tokens

    // For now, we return the API key (should be replaced with temp token in production)
    // Soniox temp token endpoint: POST https://api.soniox.com/v1/auth/temporary-token

    const response = await fetch("https://api.soniox.com/v1/auth/temporary-token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SONIOX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Token valid for 1 hour
        expires_in_seconds: 3600,
      }),
    });

    if (!response.ok) {
      // If temp token endpoint doesn't exist or fails, use API key directly
      // This is fine for development but should use temp tokens in production
      console.log("Temp token endpoint not available, using API key directly");

      return new Response(
        JSON.stringify({
          token: SONIOX_API_KEY,
          expiresAt: Date.now() + 3600000, // 1 hour from now
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        token: data.token || data.api_key,
        expiresAt: data.expires_at || Date.now() + 3600000,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting Soniox token:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
