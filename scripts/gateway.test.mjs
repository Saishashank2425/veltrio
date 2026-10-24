import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const source = await readFile(resolve("lib/gateway.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const gateway = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

beforeEach(() => {
  gateway.monthlySpend.Travel = 1340;
  gateway.monthlySpend["Operating Expenses"] = 4780;
  gateway.monthlySpend["Software & SaaS"] = 0;
  gateway.auditLog.length = 0;
});

test("allows a known, low-value office-supplies proposal", () => {
  const result = gateway.authorize({
    agent: "ProcureBot", vendor: "Staples", category: "Operating Expenses",
    amount: 64, description: "Office supplies", isNewVendor: false,
  });
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.rulesEvaluated.length, 5);
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4844);
});

test("blocks an unknown vendor even if the caller claims it is not new", () => {
  const result = gateway.authorize({
    agent: "ProcureBot", vendor: "UnknownVendor", category: "Operating Expenses",
    amount: 64, description: "Unapproved purchase", isNewVendor: false,
  });
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R001");
  assert.equal(gateway.monthlySpend["Operating Expenses"], 4780);
});

test("blocks a transaction above the per-vendor limit", () => {
  const result = gateway.authorize({
    agent: "TravelBot", vendor: "Delta Airlines", category: "Travel",
    amount: 750, description: "Flight", isNewVendor: false,
  });
  assert.equal(result.decision, "BLOCK");
  assert.equal(result.triggeringRule?.ruleId, "R003");
});

test("escalates subscription proposals", () => {
  const result = gateway.authorize({
    agent: "OpsBot", vendor: "Zoom", category: "Software & SaaS",
    amount: 150, description: "New subscription", isSubscription: true,
    isNewVendor: false,
  });
  assert.equal(result.decision, "ESCALATE");
  assert.equal(result.triggeringRule?.ruleId, "R002");
});

test("rejects missing fields and invalid amounts", () => {
  assert.equal(gateway.validateProposal({}).ok, false);
  assert.equal(gateway.validateProposal({
    agent: "ProcureBot", vendor: "Staples", category: "Operating Expenses",
    amount: Infinity, description: "Invalid amount",
  }).ok, false);
});

test("records every decision in the audit log", () => {
  gateway.authorize({
    agent: "ProcureBot", vendor: "UnknownVendor", category: "Operating Expenses",
    amount: 64, description: "Unapproved purchase", isNewVendor: false,
  });
  assert.equal(gateway.auditLog.length, 1);
});
