/* ============================================================
   Veltrio — Deterministic Authorization Gateway
   
   Shared module: used by /api/authorize and any server actions.
   
   Rule evaluation contract:
   - Rules are evaluated in order.
   - First BLOCK terminates evaluation (fail closed).
   - First ESCALATE suspends; evaluation continues in case a
     later rule produces BLOCK (BLOCK always wins over ESCALATE).
   - All rules ALLOW → final decision is ALLOW.
   - No AI model is consulted during authorization.
   ============================================================ */

export interface PurchaseProposal {
  agent: string;
  vendor: string;
  category: string;
  amount: number;       // USD, positive
  currency?: string;
  description: string;
  isSubscription?: boolean;
  isNewVendor?: boolean;
}

export type Decision = "ALLOW" | "BLOCK" | "ESCALATE";

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  outcome: Decision;
  reason: string;
  valueChecked?: string;
  thresholdApplied?: string;
}

export interface AuthorizationResult {
  decision: Decision;
  proposal: PurchaseProposal;
  rulesEvaluated: RuleResult[];
  triggeringRule: RuleResult | null;
  auditId: string;
  timestamp: string;
  durationMs: number;
}

/* ============================================================
   In-memory spend tracking
   Resets on server restart (demo only — no persistence).
   ============================================================ */
export const monthlySpend: Record<string, number> = {
  Travel: 1340,
  "Operating Expenses": 4780,
  "Software & SaaS": 0,
};

const INITIAL_MONTHLY_SPEND: Record<string, number> = {
  Travel: 1340,
  "Operating Expenses": 4780,
  "Software & SaaS": 0,
};

export function resetDemoState(): void {
  for (const key of Object.keys(monthlySpend)) delete monthlySpend[key];
  Object.assign(monthlySpend, INITIAL_MONTHLY_SPEND);
  auditLog.length = 0;
}

export function getCategorySpend(category: string): number {
  return monthlySpend[category] ?? 0;
}

export function recordSpend(category: string, amount: number): void {
  monthlySpend[category] = (monthlySpend[category] ?? 0) + amount;
}

/* ============================================================
   Audit log (in-memory ring buffer — last 50 decisions)
   ============================================================ */
export const auditLog: AuthorizationResult[] = [];
const AUDIT_LOG_MAX = 50;

export function appendAudit(result: AuthorizationResult): void {
  auditLog.unshift(result);
  if (auditLog.length > AUDIT_LOG_MAX) auditLog.length = AUDIT_LOG_MAX;
}

/* ============================================================
   Policy constants (single source of truth)
   ============================================================ */
export const POLICY = {
  ALLOWED_VENDORS: new Set([
    "Staples",
    "Delta Airlines",
    "United Airlines",
    "American Airlines",
    "Marriott",
    "Hilton",
    "Office Depot",
    "FedEx",
    "UPS",
    "Zoom",
  ]),

  CATEGORY_MONTHLY_LIMITS: {
    Travel: 2000,
    "Operating Expenses": 5000,
    "Software & SaaS": 0, // All SaaS requires escalation
  } as Record<string, number>,

  /** Hard block above this amount (single transaction) */
  HARD_BLOCK_THRESHOLD: 5000,

  /** Escalation required at or above this amount */
  SINGLE_TX_ESCALATION_THRESHOLD: 1000,

  /** Max per-vendor spend per transaction */
  VENDOR_TX_LIMIT: 500,
} as const;

/* ============================================================
   Rule evaluators
   ============================================================ */
type RuleEvaluator = (p: PurchaseProposal) => RuleResult;

const RULES: RuleEvaluator[] = [
  /* R001 — Vendor allowlist */
  (p) => {
    if (!POLICY.ALLOWED_VENDORS.has(p.vendor)) {
      return {
        ruleId: "R001",
        ruleName: "Vendor Allowlist",
        outcome: "BLOCK",
        reason: `Vendor "${p.vendor}" is not on the approved vendor allowlist.`,
        valueChecked: p.vendor,
        thresholdApplied: "Allowlisted vendors only",
      };
    }
    return {
      ruleId: "R001",
      ruleName: "Vendor Allowlist",
      outcome: "ALLOW",
      reason: "Vendor check passed.",
    };
  },

  /* R002 — Subscriptions require escalation */
  (p) => {
    if (p.isSubscription) {
      return {
        ruleId: "R002",
        ruleName: "Subscription Policy",
        outcome: "ESCALATE",
        reason: "New subscription spending requires human approval before execution.",
        valueChecked: `isSubscription=true, amount=$${p.amount}`,
        thresholdApplied: "All new subscriptions → ESCALATE",
      };
    }
    return {
      ruleId: "R002",
      ruleName: "Subscription Policy",
      outcome: "ALLOW",
      reason: "Not a subscription.",
    };
  },

  /* R003 — Per-vendor transaction limit */
  (p) => {
    if (p.amount > POLICY.VENDOR_TX_LIMIT) {
      return {
        ruleId: "R003",
        ruleName: "Per-Vendor Transaction Limit",
        outcome: "BLOCK",
        reason: `Transaction amount $${p.amount} exceeds the per-vendor limit of $${POLICY.VENDOR_TX_LIMIT}.`,
        valueChecked: `$${p.amount}`,
        thresholdApplied: `$${POLICY.VENDOR_TX_LIMIT} per transaction`,
      };
    }
    return {
      ruleId: "R003",
      ruleName: "Per-Vendor Transaction Limit",
      outcome: "ALLOW",
      reason: `Amount $${p.amount} is within the $${POLICY.VENDOR_TX_LIMIT} per-transaction limit.`,
    };
  },

  /* R004 — Category monthly budget */
  (p) => {
    const limit = POLICY.CATEGORY_MONTHLY_LIMITS[p.category];
    if (limit !== undefined) {
      if (limit === 0) {
        return {
          ruleId: "R004",
          ruleName: "Category Monthly Budget",
          outcome: "ESCALATE",
          reason: `Category "${p.category}" has no auto-spend allowance. Escalation required.`,
          valueChecked: `category=${p.category}`,
          thresholdApplied: "$0 auto-spend limit",
        };
      }
      const current = getCategorySpend(p.category);
      const projected = current + p.amount;
      if (projected > limit) {
        const outcome: Decision = projected > limit * 1.1 ? "BLOCK" : "ESCALATE";
        return {
          ruleId: "R004",
          ruleName: "Category Monthly Budget",
          outcome,
          reason: `Projected monthly spend $${projected.toFixed(2)} would exceed $${limit} budget for "${p.category}".`,
          valueChecked: `current=$${current}, proposed=$${p.amount}, projected=$${projected.toFixed(2)}`,
          thresholdApplied: `$${limit}/month`,
        };
      }
    }
    return {
      ruleId: "R004",
      ruleName: "Category Monthly Budget",
      outcome: "ALLOW",
      reason: "Category budget check passed.",
    };
  },

  /* R005 — High-value single transaction escalation */
  (p) => {
    if (p.amount >= POLICY.SINGLE_TX_ESCALATION_THRESHOLD) {
      return {
        ruleId: "R005",
        ruleName: "High-Value Transaction Escalation",
        outcome: "ESCALATE",
        reason: `Transaction $${p.amount} meets or exceeds the $${POLICY.SINGLE_TX_ESCALATION_THRESHOLD} escalation threshold.`,
        valueChecked: `$${p.amount}`,
        thresholdApplied: `$${POLICY.SINGLE_TX_ESCALATION_THRESHOLD} floor`,
      };
    }
    return {
      ruleId: "R005",
      ruleName: "High-Value Transaction Escalation",
      outcome: "ALLOW",
      reason: "Amount below escalation threshold.",
    };
  },
];

/* ============================================================
   Core authorization function (exported for testing)
   ============================================================ */
export function authorize(proposal: PurchaseProposal): AuthorizationResult {
  const start = Date.now();
  const rulesEvaluated: RuleResult[] = [];
  let triggeringRule: RuleResult | null = null;
  let finalDecision: Decision = "ALLOW";

  for (const rule of RULES) {
    const result = rule(proposal);
    rulesEvaluated.push(result);

    if (result.outcome === "BLOCK") {
      finalDecision = "BLOCK";
      triggeringRule = result;
      break; // fail closed — stop immediately
    }

    if (result.outcome === "ESCALATE" && finalDecision === "ALLOW") {
      finalDecision = "ESCALATE";
      triggeringRule = result;
      // keep going — BLOCK from a later rule overrides ESCALATE
    }
  }

  // Record spend only when approved
  if (finalDecision === "ALLOW") {
    recordSpend(proposal.category, proposal.amount);
  }

  const authResult: AuthorizationResult = {
    decision: finalDecision,
    proposal,
    rulesEvaluated,
    triggeringRule,
    auditId: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  appendAudit(authResult);
  return authResult;
}

/* ============================================================
   Input validation
   ============================================================ */
export function validateProposal(
  body: unknown
): { ok: true; proposal: PurchaseProposal } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;
  const requiredTextFields = ["agent", "vendor", "category", "description"] as const;

  for (const field of requiredTextFields) {
    if (b[field] === undefined || b[field] === null || b[field] === "") {
      return { ok: false, error: `Missing required field: ${field}` };
    }
    if (typeof b[field] !== "string" || !b[field].trim()) {
      return { ok: false, error: `${field} must be a non-empty string.` };
    }
  }

  if (typeof b.amount !== "number" || b.amount <= 0 || !Number.isFinite(b.amount)) {
    return { ok: false, error: "amount must be a positive finite number (USD)." };
  }

  if (b.currency !== undefined && b.currency !== "USD") {
    return { ok: false, error: "Only USD is supported by the current authorization policy." };
  }

  for (const field of ["isSubscription", "isNewVendor"] as const) {
    if (b[field] !== undefined && typeof b[field] !== "boolean") {
      return { ok: false, error: `${field} must be a boolean when provided.` };
    }
  }

  // Narrow the validated unknown values before constructing the typed proposal.
  const agent = b.agent as string;
  const vendor = b.vendor as string;
  const category = b.category as string;
  const description = b.description as string;

  return {
    ok: true,
    proposal: {
      agent: agent.slice(0, 100),
      vendor: vendor.slice(0, 100),
      category: category.slice(0, 100),
      amount: b.amount,
      currency: "USD",
      description: description.slice(0, 500),
      isSubscription: b.isSubscription === true,
      isNewVendor: b.isNewVendor === true,
    },
  };
}
