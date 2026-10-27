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
const proposal = (overrides = {}) => ({
  agent: "ProcureBot", vendor: "Staples", category: "Operating Expenses",
  amount: 64, description: "Office supplies", isSubscription: false,
  isNewVendor: false, ...overrides,
});
beforeEach(() => gateway.resetDemoState());

test("allows a known low-value purchase and records spend", () => {
  const result = gateway.authorize(proposal());
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.rulesEvaluated.length, 5);
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4844);
});
test("blocks an unknown vendor even when isNewVendor is false", () => {
  const result = gateway.authorize(proposal({ vendor: "UnknownVendor" }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R001");
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4780);
});
test("blocks a transaction above the per-vendor limit", () => {
  const result = gateway.authorize(proposal({ vendor: "Delta Airlines", category: "Travel", amount: 750 }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R003");
});
test("escalates subscriptions for human approval", () => {
  const result = gateway.authorize(proposal({ vendor: "Zoom", category: "Software & SaaS", amount: 150, isSubscription: true }));
  assert.equal(result.decision, "ESCALATE");
  assert.equal(result.triggeringRule?.ruleId, "R002");
});
test("escalates when projected travel spend slightly exceeds its budget", () => {
  const result = gateway.authorize(proposal({ vendor: "Marriott", category: "Travel", amount: 800 }));
  assert.equal(result.decision, "ESCALATE");
  assert.equal(result.triggeringRule?.ruleId, "R004");
});
test("blocks when projected category spend exceeds 110% of budget", () => {
  const result = gateway.authorize(proposal({ vendor: "Staples", category: "Operating Expenses", amount: 800 }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R004");
});
test("a later hard block overrides an earlier subscription escalation", () => {
  const result = gateway.authorize(proposal({ vendor: "Zoom", category: "Software & SaaS", amount: 750, isSubscription: true }));
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R003");
});
test("rejects missing fields, non-positive amounts and non-finite amounts", () => {
  assert.equal(gateway.validateProposal({}).ok, false);
  assert.equal(gateway.validateProposal(proposal({ amount: 0 })).ok, false);
  assert.equal(gateway.validateProposal(proposal({ amount: Infinity })).ok, false);
});
test("caps audit history at 50 records", () => {
  for (let i = 0; i < 55; i++) gateway.authorize(proposal({ description: `Purchase ${i}` }));
  assert.equal(gateway.auditLog.length, 50);
});
test("reset restores initial spend and clears audit history", () => {
  gateway.authorize(proposal());
  gateway.resetDemoState();
  assert.equal(gateway.auditLog.length, 0);
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4780);
  assert.equal(gateway.monthlySpend.Travel, 1340);
});
