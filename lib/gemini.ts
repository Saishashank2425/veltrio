const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"] as const;

export async function requestGeminiInteraction(input: string, maxOutputTokens: number, timeoutMs: number) {
  let lastError: unknown;
  for (let index = 0; index < GEMINI_MODELS.length; index++) {
    const model = GEMINI_MODELS[index];
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY?.trim() ?? "",
        },
        body: JSON.stringify({
          model,
          input,
          store: false,
          generation_config: { thinking_level: "low", max_output_tokens: maxOutputTokens },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if ([429, 500, 502, 503, 504].includes(response.status) && index < GEMINI_MODELS.length - 1) {
        console.warn("Gemini model temporarily unavailable; trying fallback model", model, response.status);
        continue;
      }
      return { response, model };
    } catch (error) {
      lastError = error;
      if (index === GEMINI_MODELS.length - 1) throw error;
      console.warn("Gemini request failed; trying fallback model", model);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini providers are unavailable.");
}
