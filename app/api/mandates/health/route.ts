import { NextResponse } from "next/server";

/**
 * Safe, server-side Gemini diagnostic.
 * Never returns or logs the API key. This endpoint sends only a tiny probe prompt.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      provider: "Gemini",
      model: "gemini-3.8-flash",
      configured: false,
      message: "GEMINI_API_KEY is missing from the Render service environment.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: "Reply with the single word OK.",
          store: false,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json() as { error?: { message?: string; status?: string } };
        detail = body.error?.message ?? body.error?.status ?? "";
      } catch {
        // Keep the diagnostic safe even if the provider returns non-JSON.
      }
      console.error("Gemini health check failed with HTTP", response.status);
      return NextResponse.json({
        ok: false,
        provider: "Gemini",
        model: "gemini-3.8-flash",
        configured: true,
        httpStatus: response.status,
        message: detail.slice(0, 240) || "Gemini rejected the test request. Check the API key, project access, and quota in Google AI Studio.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await response.json() as {
      output_text?: string;
      output?: Array<{ type?: string; text?: string; content?: Array<{ type?: string; text?: string }> }>;
    };
    const reply = (payload.output_text ?? payload.output?.flatMap(item =>
      item.type === "text" && item.text ? [item.text] : (item.content ?? []).map(part => part.text ?? "")
    ).join("")).trim();
    if (!reply) {
      return NextResponse.json({
        ok: false,
        provider: "Gemini",
        model: "gemini-3.8-flash",
        configured: true,
        message: "Gemini accepted the request but returned no text. Check model access and quota.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      ok: true,
      provider: "Gemini",
      model: "gemini-3.8-flash",
      configured: true,
      message: "Gemini API key and model request are working.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("Gemini health check failed:", timeout ? "timeout" : "network error");
    return NextResponse.json({
      ok: false,
      provider: "Gemini",
      model: "gemini-3.8-flash",
      configured: true,
      message: timeout
        ? "Gemini did not respond within 10 seconds. Retry shortly and check provider availability."
        : "Could not reach Gemini. Check outbound network access and retry.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
