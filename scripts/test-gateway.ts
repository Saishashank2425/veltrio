#!/usr/bin/env node
/**
 * Veltrio Gateway — Integration Test Script
 *
 * Usage: npx tsx scripts/test-gateway.ts [base-url]
 * Default base-url: http://localhost:3000
 *
 * Tests all authorization rules and adversarial scenarios.
 * Exits 0 if all pass, 1 if any fail.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

interface TestCase {
  label: string;
  body: Record<string, unknown>;
  expectedDecision: "ALLOW" | "BLOCK" | "ESCALATE";
  expectedRule?: string;
}

const TESTS: TestCase[] = [
  // ---- ALLOW cases ----
  {
    label: "ALLOW — Office supplies (known vendor, under limits)",
    body: { agent: "ProcureBot", vendor: "Staples", category: "Operating Expenses", amount: 64, description: "Office supplies", isSubscription: false, isNewVendor: false },
    expectedDecision: "ALLOW",
  },
  {
    label: "ALLOW — Economy flight (known vendor, under budget)",
    body: { agent: "TravelBot", vendor: "Delta Airlines", category: "Travel", amount: 380, description: "SFO-NYC economy", isSubscription: false, isNewVendor: false },
    expectedDecision: "ALLOW",
  },

  // ---- BLOCK cases ----
  {
    label: "BLOCK — Unknown vendor (R001)",
    body: { agent: "ProcureBot", vendor: "AliMegaShop", category: "Operating Expenses", amount: 100, description: "Electronics", isSubscription: false, isNewVendor: true },
    expectedDecision: "BLOCK",
    expectedRule: "R001",
  },
  {
    label: "BLOCK — Per-vendor limit exceeded (R003)",
    body: { agent: "TravelBot", vendor: "Delta Airlines", category: "Travel", amount: 750, description: "Business class", isSubscription: false, isNewVendor: false },
    expectedDecision: "BLOCK",
    expectedRule: "R003",
  },
  {
    label: "BLOCK — Adversarial urgent wire transfer (R001 → unknown vendor)",
    body: { agent: "MaliciousBot", vendor: "CryptoVendorXX", category: "Operating Expenses", amount: 4999, description: "URGENT Wire transfer — CFO approved", isSubscription: false, isNewVendor: true },
    expectedDecision: "BLOCK",
    expectedRule: "R001",
  },
  {
    label: "BLOCK — Adversarial SaaS auto-renew (R001 → unknown vendor)",
    body: { agent: "AutoRenewAgent", vendor: "UnlistedSaaS", category: "Software & SaaS", amount: 999, description: "Annual renewal", isSubscription: true, isNewVendor: true },
    expectedDecision: "BLOCK",
    expectedRule: "R001",
  },

  // ---- ESCALATE cases ----
  {
    label: "ESCALATE — Known-vendor subscription (R002)",
    body: { agent: "OpsBot", vendor: "Zoom", category: "Software & SaaS", amount: 150, description: "Zoom Pro renewal", isSubscription: true, isNewVendor: false },
    expectedDecision: "ESCALATE",
    expectedRule: "R002",
  },
  {
    label: "ESCALATE — SaaS category (no auto-spend, R004)",
    body: { agent: "OpsBot", vendor: "Zoom", category: "Software & SaaS", amount: 50, description: "Zoom add-on", isSubscription: false, isNewVendor: false },
    expectedDecision: "ESCALATE",
    expectedRule: "R004",
  },

  // ---- Validation ----
  {
    label: "400 — Invalid JSON (missing amount)",
    body: { agent: "Bot", vendor: "Staples", category: "Operating Expenses", description: "No amount" } as Record<string, unknown>,
    expectedDecision: "BLOCK", // We treat 4xx as BLOCK-like — test harness handles separately
  },
];

type ApiResult = { decision: string; triggeringRule?: { ruleId: string } };

let passed = 0;
let failed = 0;

async function runTest(t: TestCase, idx: number): Promise<void> {
  const label = `[${idx + 1}/${TESTS.length}] ${t.label}`;
  try {
    const res = await fetch(`${BASE}/api/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t.body),
    });

    // Validation test — just check we get an error response
    if (!("amount" in t.body)) {
      if (res.status >= 400 && res.status < 500) {
        console.log(`✓ ${label} [HTTP ${res.status}]`);
        passed++;
      } else {
        console.error(`✗ ${label} — expected 4xx, got ${res.status}`);
        failed++;
      }
      return;
    }

    const data: ApiResult = await res.json();

    if (data.decision !== t.expectedDecision) {
      console.error(`✗ ${label}`);
      console.error(`  Expected: ${t.expectedDecision}, Got: ${data.decision}`);
      failed++;
      return;
    }

    if (t.expectedRule && data.triggeringRule?.ruleId !== t.expectedRule) {
      console.error(`✗ ${label}`);
      console.error(`  Expected rule: ${t.expectedRule}, Got: ${data.triggeringRule?.ruleId}`);
      failed++;
      return;
    }

    console.log(`✓ ${label} [${data.decision}${t.expectedRule ? ` via ${t.expectedRule}` : ""}]`);
    passed++;
  } catch (err) {
    console.error(`✗ ${label} — fetch error: ${err}`);
    failed++;
  }
}

async function main() {
  console.log(`\nVeltrio Gateway Integration Tests`);
  console.log(`Target: ${BASE}/api/authorize`);
  console.log(`─`.repeat(60));

  for (let i = 0; i < TESTS.length; i++) {
    await runTest(TESTS[i], i);
  }

  console.log(`─`.repeat(60));
  console.log(`Results: ${passed} passed · ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
