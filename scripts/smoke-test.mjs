import { spawn } from "node:child_process";
import process from "node:process";

const port = 3187;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});
let serverOutput = "";
let sessionCookie = "";
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
async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (sessionCookie) headers.set("cookie", sessionCookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) sessionCookie = setCookie.split(";")[0];
  return response;
}
async function postProposal(proposal) {
  return apiFetch("/api/authorize", {
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

  const mandateResponse = await apiFetch("/api/mandates/parse", {
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

  const merchantMandateResponse = await apiFetch("/api/mandates/parse", {
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

  const invalidMandateResponse = await apiFetch("/api/mandates/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "bad" }),
  });
  await assertStatus(invalidMandateResponse, 422, "Invalid mandate");

  const mixedCurrencyResponse = await apiFetch("/api/mandates/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Allow purchases up to ₹5,000 per order and $50 per month." }),
  });
  await assertStatus(mixedCurrencyResponse, 200, "Mixed-currency mandate");
  const mixedCurrencyMandate = (await mixedCurrencyResponse.json()).mandate;
  if (!mixedCurrencyMandate?.needsClarification?.some(note => /confirm the currency/i.test(note))) {
    throw new Error("Mixed INR and USD instructions must require explicit currency clarification.");
  }

  const invalidProductResponse = await apiFetch("/api/products?q=x");
  await assertStatus(invalidProductResponse, 400, "Invalid product query");

  const rulesResponse = await apiFetch("/api/rules");
  await assertStatus(rulesResponse, 200, "GET /api/rules");
  const rules = await rulesResponse.json();
  if (!Array.isArray(rules.rules) || rules.rules.length !== 6) throw new Error("Expected the saved mandate rule and five policy rules.");

  const mandateId = crypto.randomUUID();
  const saveMandateResponse = await apiFetch("/api/mandates", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: mandateId, name: "Smoke test mandate", purpose: "Temporary smoke test policy", maxPerTransaction: 100, monthlyBudget: null, currency: "USD", allowedMerchants: [], blockedMerchants: [], categories: [], blockedCategories: [], approvalAbove: 80, expiresInDays: 1, confidence: "high", needsClarification: [] }),
  });
  await assertStatus(saveMandateResponse, 201, "Save persistent mandate");
  const savedMandates = await (await apiFetch("/api/mandates")).json();
  if (!savedMandates.mandates?.some(item => item.id === mandateId && item.active)) throw new Error("Saved mandate was not returned as active from PostgreSQL.");
  const isolatedMandates = await (await fetch(`${base}/api/mandates`)).json();
  if (isolatedMandates.mandates?.some(item => item.id === mandateId)) throw new Error("One browser session can read another session's saved mandate.");

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

  const auditBeforeResponse = await apiFetch("/api/authorize");
  await assertStatus(auditBeforeResponse, 200, "Read existing audit history");
  const auditBefore = (await auditBeforeResponse.json()).count;
  const auditResponse = await apiFetch("/api/authorize");
  await assertStatus(auditResponse, 200, "GET /api/authorize");
  if (auditBefore < 3 || (await auditResponse.json()).count !== auditBefore) throw new Error("Authorization audit history should retain each valid decision without changing on read.");

  const blockedByMandate = await postProposal({ ...baseProposal, amount: 101 });
  await assertStatus(blockedByMandate, 403, "Active mandate per-purchase cap");
  if ((await blockedByMandate.json()).triggeringRule?.ruleId !== "M001") throw new Error("Active mandate cap should block the proposal.");

  const deleteMandateResponse = await apiFetch(`/api/mandates?id=${mandateId}`, { method: "DELETE" });
  await assertStatus(deleteMandateResponse, 200, "Delete persistent mandate");

  console.log("Production API smoke tests passed: mandate parsing and persistence, product-query validation, rules, ALLOW, BLOCK, ESCALATE, mandate enforcement, validation, and durable audit.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
