import { NextResponse } from "next/server";
import { POLICY, monthlySpend } from "@/lib/gateway";

/* ============================================================
   GET /api/rules
   Returns the active policy rules and current monthly spend state.
   Read-only — demo inspection endpoint.
   ============================================================ */
export async function GET() {
  const rules = [
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
      currentSpend: { ...monthlySpend },
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

  return NextResponse.json({ rules });
}
