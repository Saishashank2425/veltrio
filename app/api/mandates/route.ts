import { NextRequest, NextResponse } from "next/server";
import { deleteMandate, listMandates, saveMandate } from "@/lib/persistence";
import { getSessionId, setSessionCookie } from "@/lib/session";

const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 20 && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= 100);
const isPositiveOrNull = (value: unknown): value is number | null => value === null || (typeof value === "number" && Number.isFinite(value) && value > 0);

export async function GET(request: NextRequest) {
  const session = getSessionId(request);
  try { return setSessionCookie(NextResponse.json({ mandates: await listMandates(session.id) }), session); }
  catch (error) {
    console.error("Mandate list read failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Saved mandates are temporarily unavailable." }, { status: 503 }), session);
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionId(request);
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Send a valid JSON object." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "A mandate object is required." }, { status: 422 });
  const value = body as Record<string, unknown>;
  if (typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id) || typeof value.name !== "string" || !value.name.trim() || value.name.length > 100 || typeof value.purpose !== "string" || !value.purpose.trim() || value.purpose.length > 1200) {
    return NextResponse.json({ error: "Mandate ID, name, and purpose are required." }, { status: 422 });
  }
  if (value.currency !== "USD" && value.currency !== "INR") return NextResponse.json({ error: "Mandate currency must be USD or INR." }, { status: 422 });
  if (!["maxPerTransaction", "monthlyBudget", "approvalAbove"].every(key => isPositiveOrNull(value[key]))) return NextResponse.json({ error: "Mandate limits must be positive numbers or empty." }, { status: 422 });
  if (!["allowedMerchants", "blockedMerchants", "categories", "blockedCategories", "needsClarification"].every(key => isTextList(value[key]))) return NextResponse.json({ error: "Mandate restrictions must be short text lists." }, { status: 422 });
  if ((value.needsClarification as string[]).length) return NextResponse.json({ error: "Resolve clarification notes before saving a mandate." }, { status: 422 });
  if (!isPositiveOrNull(value.expiresInDays) || (value.expiresInDays !== null && value.expiresInDays > 365)) return NextResponse.json({ error: "Mandate expiry must be from 1 to 365 days." }, { status: 422 });
  if (value.confidence !== "high" && value.confidence !== "medium" && value.confidence !== "low") return NextResponse.json({ error: "Mandate confidence is invalid." }, { status: 422 });

  try {
    const mandate = await saveMandate(session.id, value as Parameters<typeof saveMandate>[1]);
    return setSessionCookie(NextResponse.json({ mandate }, { status: 201 }), session);
  } catch (error) {
    console.error("Mandate save failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "The mandate could not be saved." }, { status: 503 }), session);
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionId(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "A valid mandate ID is required." }, { status: 422 });
  try { await deleteMandate(session.id, id); return setSessionCookie(NextResponse.json({ ok: true }), session); }
  catch (error) {
    console.error("Mandate delete failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "The mandate could not be deleted." }, { status: 503 }), session);
  }
}
