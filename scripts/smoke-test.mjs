import { spawn } from "node:child_process";
import process from "node:process";

const port = 3187;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Next server exited early.\n${serverOutput}`);
    try {
      const response = await fetch(`${base}/api/rules`);
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for Next server.\n${serverOutput}`);
}
async function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${label}: expected HTTP ${expected}, got ${response.status}: ${body}`);
  }
}
async function postProposal(proposal) {
  return fetch(`${base}/api/authorize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(proposal),
  });
}
const baseProposal = {
  agent: "SmokeTestBot", vendor: "Staples", category: "Operating Expenses",
  amount: 64, description: "Automated smoke test", isSubscription: false,
  isNewVendor: false,
};

try {
  await waitForServer();

  const mandateResponse = await fetch(`${base}/api/mandates/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Allow my shopping agent to buy electronics under ₹5,000 per purchase, with a monthly budget of ₹12,000. Ask me to approve anything above ₹3,000. Valid for 30 days." }),
  });
  await assertStatus(mandateResponse, 200, "POST /api/mandates/parse");
  const mandateBody = await mandateResponse.json();
  if (mandateBody.mandate?.maxPerTransaction !== 5000) throw new Error("Mandate parser should extract ₹5,000 per-purchase cap.");
  if (mandateBody.mandate?.monthlyBudget !== 12000) throw new Error("Mandate parser should extract ₹12,000 monthly budget.");
  if (mandateBody.mandate?.approvalAbove !== 3000) throw new Error("Mandate parser should extract ₹3,000 approval threshold.");
  if (mandateBody.mandate?.expiresInDays !== 30) throw new Error("Mandate parser should extract 30-day expiry.");

  const merchantMandateResponse = await fetch(`${base}/api/mandates/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Only allow groceries from BigBasket and Amazon Fresh, max ₹2,000 per order, block subscriptions, and ask for approval above ₹1,000." }),
  });
  await assertStatus(merchantMandateResponse, 200, "Merchant-restricted mandate");
  const merchantMandate = (await merchantMandateResponse.json()).mandate;
  if (merchantMandate?.maxPerTransaction !== 2000) throw new Error("Mandate parser should extract ₹2,000 purchase cap.");
  if (merchantMandate?.approvalAbove !== 1000) throw new Error("Mandate parser should extract ₹1,000 approval threshold.");
  if (!merchantMandate?.allowedMerchants?.includes("BigBasket") || !merchantMandate?.allowedMerchants?.includes("Amazon Fresh")) {
    throw new Error("Mandate parser should extract allowed merchants.");
  }
  if (!merchantMandate?.blockedCategories?.includes("subscriptions")) throw new Error("Mandate parser should extract blocked categories.");

  const invalidMandateResponse = await fetch(`${base}/api/mandates/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "bad" }),
  });
  await assertStatus(invalidMandateResponse, 422, "Invalid mandate");

  const invalidProductResponse = await fetch(`${base}/api/products?q=x`);
  await assertStatus(invalidProductResponse, 400, "Invalid product query");

  const rulesResponse = await fetch(`${base}/api/rules`);
  await assertStatus(rulesResponse, 200, "GET /api/rules");
  const rules = await rulesResponse.json();
  if (!Array.isArray(rules.rules) || rules.rules.length !== 5) throw new Error("Expected five policy rules.");

  const allowedResponse = await postProposal(baseProposal);
  await assertStatus(allowedResponse, 200, "Known vendor");
  if ((await allowedResponse.json()).decision !== "ALLOW") throw new Error("Known vendor should ALLOW.");

  const blockedResponse = await postProposal({ ...baseProposal, vendor: "UnlistedSmokeVendor" });
  await assertStatus(blockedResponse, 403, "Unknown vendor");
  if ((await blockedResponse.json()).decision !== "BLOCK") throw new Error("Unknown vendor should BLOCK.");

  const escalatedResponse = await postProposal({ ...baseProposal, vendor: "Zoom", category: "Software & SaaS", isSubscription: true });
  await assertStatus(escalatedResponse, 202, "Subscription");
  if ((await escalatedResponse.json()).decision !== "ESCALATE") throw new Error("Subscription should ESCALATE.");

  const invalidResponse = await postProposal({ ...baseProposal, amount: -1 });
  await assertStatus(invalidResponse, 422, "Invalid amount");

  const auditResponse = await fetch(`${base}/api/authorize`);
  await assertStatus(auditResponse, 200, "GET /api/authorize");
  if ((await auditResponse.json()).count !== 3) throw new Error("Audit log should contain three valid decisions.");

  const resetResponse = await fetch(`${base}/api/reset`, { method: "POST" });
  await assertStatus(resetResponse, 200, "POST /api/reset");
  const afterReset = await (await fetch(`${base}/api/authorize`)).json();
  if (afterReset.count !== 0) throw new Error("Reset should clear audit history.");

  console.log("Production API smoke tests passed: mandate parsing, product-query validation, rules, ALLOW, BLOCK, ESCALATE, validation, audit, reset.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
