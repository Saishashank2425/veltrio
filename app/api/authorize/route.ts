import { NextRequest, NextResponse } from "next/server";
import { validateProposal } from "@/lib/gateway";
import { authorizePersisted, listAuditHistory } from "@/lib/persistence";
import { getSessionId, setSessionCookie } from "@/lib/session";

export type { PurchaseProposal, Decision, RuleResult, AuthorizationResult } from "@/lib/gateway";

/* ============================================================
   POST /api/authorize
   Submit a purchase proposal for deterministic authorization.
   ============================================================ */
export async function POST(req: NextRequest) {
  const session = getSessionId(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return setSessionCookie(NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }), session);
  }

  const validation = validateProposal(body);
  if (!validation.ok) {
    return setSessionCookie(NextResponse.json({ error: validation.error }, { status: 422 }), session);
  }

  let result;
  try {
    result = await authorizePersisted(session.id, validation.proposal, { recordSpend: true });
  } catch (error) {
    console.error("Authorization persistence failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Authorization is temporarily unavailable. The proposal was not approved." }, { status: 503 }), session);
  }

  const status =
    result.decision === "ALLOW" ? 200 :
    result.decision === "ESCALATE" ? 202 :
    403;

  return setSessionCookie(NextResponse.json(result, { status }), session);
}

/* ============================================================
   GET /api/authorize
   Returns the in-memory audit log (last 50 decisions).
   ============================================================ */
export async function GET(request: NextRequest) {
  const session = getSessionId(request);
  try { return setSessionCookie(NextResponse.json(await listAuditHistory(session.id)), session); }
  catch (error) {
    console.error("Audit history read failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Audit history is temporarily unavailable." }, { status: 503 }), session);
  }
}
