import { NextRequest, NextResponse } from "next/server";
import { authorize, validateProposal, auditLog } from "@/lib/gateway";

export type { PurchaseProposal, Decision, RuleResult, AuthorizationResult } from "@/lib/gateway";

/* ============================================================
   POST /api/authorize
   Submit a purchase proposal for deterministic authorization.
   ============================================================ */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateProposal(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const result = authorize(validation.proposal);

  const status =
    result.decision === "ALLOW" ? 200 :
    result.decision === "ESCALATE" ? 202 :
    403;

  return NextResponse.json(result, { status });
}

/* ============================================================
   GET /api/authorize
   Returns the in-memory audit log (last 50 decisions).
   ============================================================ */
export async function GET() {
  return NextResponse.json({
    count: auditLog.length,
    entries: auditLog,
  });
}
