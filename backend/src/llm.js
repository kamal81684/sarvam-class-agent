// Sarvam chat completions (OpenAI-compatible endpoint)
const SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions";

export async function chat(system, user, maxTokens = 4096) {
  const res = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "sarvam-105b",
      temperature: 0.7,
      max_tokens: maxTokens,
      reasoning_effort: null, // reasoning eats the token budget; not needed here
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Sarvam chat ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Strip any <think>...</think> reasoning the model puts in the content
  return (data.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// Ask for JSON and pull the first {...} block out of the reply (retry on bad JSON).
export async function chatJSON(system, user, maxTokens, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    const text = await chat(system + "\nRespond with valid JSON only, no markdown fences, no trailing commas.", user, maxTokens);
    try {
      return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch (err) {
      if (attempt >= tries) throw new Error(`LLM returned invalid JSON: ${err.message}`);
    }
  }
}
