import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const source = await readFile(resolve("lib/gateway.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const gateway = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const authorize = gateway.authorize;
const testMandate = { id: "test", name: "Test policy", purpose: "Allow test proposals", currency: "USD", maxPerTransaction: null, monthlyBudget: null, allowedMerchants: [], blockedMerchants: [], categories: [], blockedCategories: [], approvalAbove: null, expiresAt: null };
const decide = (purchase, options = {}) => authorize(purchase, { mandate: testMandate, ...options });
const proposal = (overrides = {}) => ({
  agent: "ProcureBot", vendor: "Staples", category: "Operating Expenses",
  amount: 64, description: "Office supplies", isSubscription: false,
  isNewVendor: false, ...overrides,
});
beforeEach(() => {
  gateway.resetDemoState();
});

test("allows a known low-value purchase and records spend", () => {
  const result = decide(proposal());
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.rulesEvaluated.length, 6);
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4844);
});
test("blocks an unknown vendor even when isNewVendor is false", () => {
  const result = decide(proposal({ vendor: "UnknownVendor" }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R001");
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4780);
});
test("blocks a transaction above the per-vendor limit", () => {
  const result = decide(proposal({ vendor: "Delta Airlines", category: "Travel", amount: 750 }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R003");
});
test("escalates subscriptions for human approval", () => {
  const result = decide(proposal({ vendor: "Zoom", category: "Software & SaaS", amount: 150, isSubscription: true }));
  assert.equal(result.decision, "ESCALATE");
  assert.equal(result.triggeringRule?.ruleId, "R002");
});
test("escalates when projected travel spend slightly exceeds its budget", () => {
  gateway.monthlySpend.Travel = 1700;
  const result = decide(proposal({ vendor: "Marriott", category: "Travel", amount: 400 }));
  assert.equal(result.decision, "ESCALATE");
  assert.equal(result.triggeringRule?.ruleId, "R004");
});
test("blocks when projected category spend exceeds 110% of budget", () => {
  gateway.monthlySpend["Operating Expenses"] = 5301;
  const result = decide(proposal({ vendor: "Staples", category: "Operating Expenses", amount: 200 }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R004");
});
test("a later hard block overrides an earlier subscription escalation", () => {
  const result = decide(proposal({ vendor: "Zoom", category: "Software & SaaS", amount: 750, isSubscription: true }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R003");
});
test("rejects missing fields, non-positive amounts and non-finite amounts", () => {
  assert.equal(gateway.validateProposal({}).ok, false);
  assert.equal(gateway.validateProposal(proposal({ amount: 0 })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ amount: Infinity })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ amount: NaN })).ok, false);
});

test("rejects malformed text fields instead of coercing objects to strings", () => {
  assert.equal(gateway.validateProposal(proposal({ vendor: { name: "Staples" } })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ description: "   " })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ agent: 42 })).ok, false);
});

test("rejects unsupported currencies and non-boolean policy flags", () => {
  assert.equal(gateway.validateProposal(proposal({ currency: "EUR" })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ isSubscription: "false" })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ isNewVendor: 0 })).ok, false);
  const valid = gateway.validateProposal(proposal({ currency: "USD", isSubscription: false }));
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.proposal.currency, "USD");
});
test("saved mandates block an unlisted merchant and amounts over the mandate cap", () => {
  const mandate = { id: "m1", name: "Work supplies", purpose: "Staples only", currency: "USD", maxPerTransaction: 100, monthlyBudget: null, allowedMerchants: ["Staples"], blockedMerchants: [], categories: [], blockedCategories: [], approvalAbove: null, expiresAt: null };
  const merchant = decide(proposal({ vendor: "Office Depot" }), { recordSpend: false, mandate });
  assert.equal(merchant.decision, "BLOCK");
  assert.equal(merchant.triggeringRule?.ruleId, "M001");
  const cap = decide(proposal({ amount: 101 }), { recordSpend: false, mandate });
  assert.equal(cap.decision, "BLOCK");
  assert.equal(cap.triggeringRule?.ruleId, "M001");
});
test("an explicitly allowed saved merchant passes the gateway vendor rule", () => {
  const mandate = { id: "m2", name: "Grocery policy", purpose: "Use approved shops", currency: "USD", maxPerTransaction: 100, monthlyBudget: null, allowedMerchants: ["Amazon Fresh"], blockedMerchants: [], categories: [], blockedCategories: [], approvalAbove: null, expiresAt: null };
  const result = decide(proposal({ vendor: "Amazon Fresh" }), { recordSpend: false, mandate });
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.rulesEvaluated[1]?.ruleId, "R001");
  assert.equal(result.rulesEvaluated[1]?.outcome, "ALLOW");
});
test("saved mandates escalate at their approval threshold and block expired mandates", () => {
  const mandate = { id: "m1", name: "Office policy", purpose: "Review over $50", currency: "USD", maxPerTransaction: 100, monthlyBudget: null, allowedMerchants: [], blockedMerchants: [], categories: [], blockedCategories: [], approvalAbove: 50, expiresAt: null };
  const approval = decide(proposal({ amount: 60 }), { recordSpend: false, mandate });
  assert.equal(approval.decision, "ESCALATE");
  assert.equal(approval.triggeringRule?.ruleId, "M001");
  const expired = decide(proposal(), { recordSpend: false, mandate: { ...mandate, expiresAt: "2000-01-01T00:00:00.000Z" } });
  assert.equal(expired.decision, "BLOCK");
  assert.equal(expired.triggeringRule?.ruleId, "M001");
});
test("PayPal capture spend is inserted once and retries must match the original record", async () => {
  const captureSource = await readFile(resolve("lib/capture-ledger.ts"), "utf8");
  const captureCompiled = ts.transpileModule(captureSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const captureLedger = await import(`data:text/javascript;base64,${Buffer.from(captureCompiled).toString("base64")}`);
  const input = { orderId: "ORDER-12345678", captureId: "CAPTURE-12345678", category: "Operating Expenses", amount: 64, currency: "USD" };
  let persisted = null;
  const client = { async query(sql, params) {
    if (sql.includes("INSERT INTO spend_entries")) {
      if (persisted) return { rowCount: 0, rows: [] };
      persisted = { category: params[4], amount: String(params[5]), currency: params[6] };
      return { rowCount: 1, rows: [{ id: 1 }] };
    }
    if (sql.includes("SELECT category")) return { rowCount: persisted ? 1 : 0, rows: persisted ? [persisted] : [] };
    throw new Error("Unexpected database query in capture test.");
  } };
  assert.deepEqual(await captureLedger.recordCaptureOnce(client, "session-1", input), { alreadyRecorded: false });
  assert.deepEqual(await captureLedger.recordCaptureOnce(client, "session-1", input), { alreadyRecorded: true });
  await assert.rejects(() => captureLedger.recordCaptureOnce(client, "session-1", { ...input, amount: 65 }), /does not match/);
});
test("caps audit history at 50 records", () => {
  for (let i = 0; i < 55; i++) decide(proposal({ description: `Purchase ${i}` }));
  assert.equal(gateway.auditLog.length, 50);
});
test("reset restores initial spend and clears audit history", () => {
  decide(proposal());
  gateway.resetDemoState();
  assert.equal(gateway.auditLog.length, 0);
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4780);
  assert.equal(gateway.monthlySpend.Travel, 1340);
});
