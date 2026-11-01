import { NextRequest, NextResponse } from "next/server";
import { deleteFinanceRecord, listFinanceRecords, saveFinanceRecords } from "@/lib/persistence";
import { getSessionId, setSessionCookie } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = new Set(["transaction", "subscription", "card", "emi", "bill"]);

function validRecord(value: unknown): value is { id: string; kind: string; amount: number; [key: string]: unknown } {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return typeof r.id === "string" && UUID.test(r.id)
    && typeof r.kind === "string" && KINDS.has(r.kind)
    && typeof r.name === "string" && r.name.trim().length > 0 && r.name.length <= 200
    && typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount >= 0 && r.amount <= 1_000_000_000
    && typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency)
    && typeof r.status === "string" && r.status.length <= 30
    && typeof r.source === "string" && ["manual", "csv"].includes(r.source);
}

export async function GET(request: NextRequest) {
  const session = getSessionId(request);
  try {
    const records = await listFinanceRecords(session.id);
    return setSessionCookie(NextResponse.json({ records, storage: "postgres" }), session);
  } catch (error) {
    console.error("Finance records read failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Finance records are temporarily unavailable." }, { status: 503 }), session);
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionId(request);
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Send valid JSON." }, { status: 400 }); }
  const records = Array.isArray(body) ? body : [body];
  if (!records.length || records.length > 500 || !records.every(validRecord)) {
    return NextResponse.json({ error: "Provide 1–500 valid finance records." }, { status: 422 });
  }
  try {
    await saveFinanceRecords(session.id, records);
    return setSessionCookie(NextResponse.json({ ok: true, saved: records.length, storage: "postgres" }), session);
  } catch (error) {
    console.error("Finance records save failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Finance records could not be saved." }, { status: 503 }), session);
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionId(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "A valid record ID is required." }, { status: 422 });
  try {
    await deleteFinanceRecord(session.id, id);
    return setSessionCookie(NextResponse.json({ ok: true }), session);
  } catch (error) {
    console.error("Finance record delete failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Finance record could not be deleted." }, { status: 503 }), session);
  }
}
