// Web search using Perplexity API

export async function searchWeb(query: string): Promise<string> {
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

  if (!perplexityKey) {
    console.log("Perplexity API key not configured");
    return "";
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Provide concise, factual answers in Hebrew. Focus on vocal coaching, singing, and voice training topics.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      return `[חיפוש אינטרנט: ${content}]`;
    }
    return "";
  } catch (error) {
    console.error("Perplexity search error:", error);
    return "";
  }
}
