import { NextRequest, NextResponse } from "next/server";
import { POLICY } from "@/lib/gateway";
import { getMonthlySpend, listMandates } from "@/lib/persistence";
import { getSessionId, setSessionCookie } from "@/lib/session";

/* ============================================================
   GET /api/rules
   Returns the active policy rules and current monthly spend state.
   Read-only — demo inspection endpoint.
   ============================================================ */
export async function GET(request: NextRequest) {
  const session = getSessionId(request);
  let currentSpend: Record<string, number>;
  let mandates: Awaited<ReturnType<typeof listMandates>>;
  try {
    const mandateRead = listMandates(session.id);
    if (session.isNew) {
      // Render's unauthenticated health probe requests this route repeatedly. Do not create demo rows for it.
      [mandates] = await Promise.all([mandateRead]);
      currentSpend = { Travel: 1340, "Operating Expenses": 4780, "Software & SaaS": 0 };
    } else {
      [currentSpend, mandates] = await Promise.all([getMonthlySpend(session.id), mandateRead]);
    }
  }
  catch {
    return setSessionCookie(NextResponse.json({ error: "Policy state is temporarily unavailable." }, { status: 503 }), session);
  }
  const rules = [
    {
      ruleId: "M001",
      ruleName: "Saved Spending Mandate",
      description: "The active saved mandate sets merchant, category, purchase, monthly, and approval restrictions.",
      type: "mandate",
      activeMandate: mandates.find(mandate => mandate.active) ?? null,
    },
    {
      ruleId: "R001",
      ruleName: "Vendor Allowlist",
      description: "Only vendors on the approved list can receive payments.",
      type: "allowlist",
      allowedVendors: Array.from(POLICY.ALLOWED_VENDORS),
    },
    {
      ruleId: "R002",
      ruleName: "Subscription Policy",
      description: "All new subscriptions require human escalation.",
      type: "category_policy",
      policy: "All subscriptions → ESCALATE",
    },
    {
      ruleId: "R003",
      ruleName: "Per-Vendor Transaction Limit",
      description: "No single transaction may exceed the vendor limit.",
      type: "threshold",
      limit: POLICY.VENDOR_TX_LIMIT,
      currency: "USD",
    },
    {
      ruleId: "R004",
      ruleName: "Category Monthly Budget",
      description: "Monthly spend ceiling per expense category.",
      type: "budget",
      limits: POLICY.CATEGORY_MONTHLY_LIMITS,
      currentSpend,
    },
    {
      ruleId: "R005",
      ruleName: "High-Value Transaction Escalation",
      description: "Single transactions at or above this threshold require escalation.",
      type: "threshold",
      threshold: POLICY.SINGLE_TX_ESCALATION_THRESHOLD,
      currency: "USD",
    },
  ];

  return setSessionCookie(NextResponse.json({ rules }), session);
}
