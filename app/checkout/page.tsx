"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { PageGuide } from "@/components/ui/PageGuide";

type Scenario = {
  id: string;
  label: string;
  description: string;
  proposal: {
    agent: string;
    vendor: string;
    category: string;
    amount: number;
    description: string;
    isSubscription: boolean;
    isNewVendor: boolean;
    currency: "USD";
  };
};

const scenarios: Scenario[] = [
  {
    id: "allow",
    label: "ALLOW · Staples office supplies · $64",
    description: "A small purchase from an approved vendor within the demo budget.",
    proposal: { agent: "VeltrioShoppingAgent", vendor: "Staples", category: "Operating Expenses", amount: 64, description: "Office supplies restock", isSubscription: false, isNewVendor: false, currency: "USD" },
  },
  {
    id: "block",
    label: "BLOCK · Unknown merchant · $49",
    description: "The vendor is not on the configured allowlist, so checkout must stop.",
    proposal: { agent: "VeltrioShoppingAgent", vendor: "AliMegaShop", category: "Operating Expenses", amount: 49, description: "Unverified accessories", isSubscription: false, isNewVendor: true, currency: "USD" },
  },
  {
    id: "escalate",
    label: "ESCALATE · Zoom subscription · $150",
    description: "Subscription purchases require a human review before checkout.",
    proposal: { agent: "VeltrioShoppingAgent", vendor: "Zoom", category: "Software & SaaS", amount: 150, description: "Zoom Pro subscription", isSubscription: true, isNewVendor: false, currency: "USD" },
  },
  {
    id: "budget",
    label: "ESCALATE · Staples bulk order · $250",
    description: "This proposal pushes the example operating-expense budget over its limit.",
    proposal: { agent: "VeltrioShoppingAgent", vendor: "Staples", category: "Operating Expenses", amount: 250, description: "Bulk office supplies order", isSubscription: false, isNewVendor: false, currency: "USD" },
  },
];

type Authorization = {
  decision: "ALLOW" | "BLOCK" | "ESCALATE";
  auditId?: string;
  triggeringRule?: { ruleName?: string; reason?: string } | null;
  rulesEvaluated?: Array<{ ruleId: string; ruleName: string; outcome: string; reason: string }>;
};

export default function SandboxCheckoutPage() {
  const [scenarioId, setScenarioId] = useState("allow");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [capture, setCapture] = useState<Record<string, unknown> | null>(null);

  const selected = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];

  const captureReturnedOrder = useCallback(async (orderId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "PayPal sandbox capture failed.");
      setCapture(data);
      setMessage(typeof data.message === "string" ? data.message : "Sandbox capture processed.");
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("token");
      cleanUrl.searchParams.delete("PayerID");
      cleanUrl.searchParams.delete("flow");
      window.history.replaceState({}, "", cleanUrl.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify the sandbox capture.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flow = params.get("flow");
    const orderId = params.get("token");
    if (flow === "return" && orderId) void captureReturnedOrder(orderId);
    if (flow === "cancelled") setMessage("You cancelled the PayPal sandbox approval. No capture was requested.");
  }, [captureReturnedOrder]);

  async function startCheckout() {
    setBusy(true);
    setError("");
    setMessage("");
    setCapture(null);
    setAuthorization(null);
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal: selected.proposal, itemName: selected.proposal.description }),
      });
      const data = await response.json();
      if (data.authorization) setAuthorization(data.authorization);
      if (!response.ok) throw new Error(data.error ?? "Unable to evaluate the proposal.");
      if (data.decision && data.decision !== "ALLOW") {
        setMessage(data.message ?? "Policy did not allow checkout.");
        return;
      }
      if (!data.configured) {
        setMessage(data.message ?? "PayPal sandbox is not configured.");
        return;
      }
      if (typeof data.approvalUrl !== "string") {
        setMessage(data.message ?? "No PayPal approval URL was returned.");
        return;
      }
      window.location.assign(data.approvalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be started.");
    } finally {
      setBusy(false);
    }
  }

  const decisionColor = authorization?.decision === "ALLOW"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : authorization?.decision === "BLOCK"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#172033]">
      <header className="border-b border-[#e6eaf1] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-[#172033]">VELTRIO<span className="ml-2 font-normal text-[#8a94a6]">/ Sandbox checkout</span></Link>
          <Link href="/demo" className="inline-flex items-center gap-2 text-xs font-semibold text-[#315bff] hover:text-[#2446d8]"><ArrowLeft size={14}/> Gateway demo</Link>
        </div>
      </header>

      <PageGuide
        eyebrow="PayPal AI Hackathon · sandbox integration"
        title="Policy first. Payment second."
        purpose="This flow connects Veltrio's deterministic authorization check to a PayPal sandbox order. Only ALLOW proposals can reach PayPal approval; BLOCK and ESCALATE outcomes stop before an order is created."
        steps={[
          "Choose a sample purchase proposal.",
          "Veltrio evaluates the merchant, amount, and category rules.",
          "Only ALLOW can create a PayPal sandbox order.",
          "After buyer approval, PayPal confirms a sandbox capture.",
        ]}
        note="Sandbox only. Use PayPal sandbox buyer credentials. No real money moves. The sample policy and audit log are in-memory demo state, not production financial controls."
        links={[{ label: "Review gateway rules", href: "/demo" }, { label: "Explore mandates", href: "/mandates" }]}
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 pt-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-[0_8px_28px_rgba(16,24,40,.04)] sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#315bff]"><ShieldCheck size={20}/></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#315bff]">Step 01 / authorization</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Test a purchase proposal</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">Start with one of the predefined scenarios. They are designed to demonstrate ALLOW, BLOCK, and ESCALATE before any PayPal sandbox order can be created.</p>
            </div>
          </div>

          <label htmlFor="scenario" className="mt-7 block text-xs font-semibold text-[#344054]">Sample scenario</label>
          <select id="scenario" value={scenarioId} onChange={(event) => { setScenarioId(event.target.value); setAuthorization(null); setMessage(""); setError(""); setCapture(null); }} className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none focus:border-[#315bff] focus:ring-4 focus:ring-[#315bff]/10">
            {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
          </select>
          <p className="mt-2 text-sm leading-6 text-[#667085]">{selected.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Merchant", selected.proposal.vendor],
              ["Amount", new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(selected.proposal.amount)],
              ["Category", selected.proposal.category],
              ["Agent", selected.proposal.agent],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#edf0f5] bg-[#fafbfe] px-4 py-3">
                <p className="text-[11px] font-medium text-[#7b8798]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#172033]">{value}</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={startCheckout} disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#315bff] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2446d8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {busy ? <LoaderCircle size={16} className="animate-spin"/> : <CreditCard size={16}/>}
            {busy ? "Checking policy…" : "Check policy & continue"}
            {!busy && <ArrowRight size={15}/>}
          </button>

          {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert size={17} className="mt-0.5 shrink-0"/><p>{error}</p></div>}
          {message && <div role="status" className="mt-5 rounded-xl border border-[#dfe5f0] bg-[#f8faff] p-4 text-sm leading-6 text-[#475467]">{message}</div>}

          {authorization && <div className={`mt-5 rounded-xl border p-4 ${decisionColor}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[.12em]">Gateway decision</p>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{authorization.decision}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{authorization.triggeringRule?.ruleName ?? "All configured demo rules passed."}</p>
            {authorization.triggeringRule?.reason && <p className="mt-1 text-xs leading-5 opacity-80">{authorization.triggeringRule.reason}</p>}
            {authorization.auditId && <p className="mt-2 font-mono text-[10px] opacity-70">Audit reference: {authorization.auditId}</p>}
            {authorization.rulesEvaluated && <div className="mt-3 space-y-2 border-t border-current/10 pt-3">
              {authorization.rulesEvaluated.map((rule) => <div key={rule.ruleId} className="flex items-start justify-between gap-4 text-xs"><span>{rule.ruleId} · {rule.ruleName}</span><span className="font-semibold">{rule.outcome}</span></div>)}
            </div>}
          </div>}

          {capture && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17}/> PayPal sandbox capture confirmed</div>
            <p className="mt-2 text-sm">{String(capture.message ?? "The sandbox order was captured.")}</p>
            <p className="mt-2 font-mono text-xs">Order: {String(capture.orderId ?? "—")} · {String(capture.currency ?? "USD")} {String(capture.amount ?? "—")}</p>
          </div>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#e1e6ef] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#315bff]">What this proves</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">An agent cannot skip the policy check.</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#667085]">
              <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600"/> Every scenario is evaluated before an order is created.</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600"/> BLOCK and ESCALATE do not create PayPal orders.</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600"/> Spend is recorded only after a confirmed sandbox capture.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-amber-800">Setup required</p>
            <h2 className="mt-2 text-base font-semibold text-amber-950">PayPal developer sandbox</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">Configure <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> from your PayPal Developer Dashboard as server-side Render environment variables. Never expose the secret in browser code or commit it to GitHub.</p>
            <a href="https://developer.paypal.com/dashboard/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-amber-900 underline underline-offset-4">Open developer dashboard <ArrowRight size={13}/></a>
          </div>
        </aside>
      </section>
    </main>
  );
}
