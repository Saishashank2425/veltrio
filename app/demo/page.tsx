"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  BookOpen,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AuthorizationResult, Decision } from "@/lib/gateway";
import { PageGuide } from "@/components/ui/PageGuide";

/* ============================================================
   Preset Scenarios (P2 — including adversarial)
   ============================================================ */
const SCENARIOS = [
  {
    label: "Office supplies · allow",
    tag: "allow",
    proposal: {
      agent: "ProcureBot",
      vendor: "Staples",
      category: "Operating Expenses",
      amount: 64,
      description: "Standard office supplies restock",
      isSubscription: false,
      isNewVendor: false,
    },
  },
  {
    label: "Economy flight · allow",
    tag: "allow",
    proposal: {
      agent: "TravelBot",
      vendor: "Delta Airlines",
      category: "Travel",
      amount: 380,
      description: "SFO → NYC economy class",
      isSubscription: false,
      isNewVendor: false,
    },
  },
  {
    label: "Unknown vendor · block",
    tag: "block",
    proposal: {
      agent: "ProcureBot",
      vendor: "AliMegaShop",
      category: "Operating Expenses",
      amount: 299,
      description: "Bulk electronics purchase",
      isSubscription: false,
      isNewVendor: true,
    },
  },
  {
    label: "Over vendor limit · block",
    tag: "block",
    proposal: {
      agent: "TravelBot",
      vendor: "Delta Airlines",
      category: "Travel",
      amount: 750,
      description: "Business class SFO → JFK",
      isSubscription: false,
      isNewVendor: false,
    },
  },
  {
    label: "New subscription · review",
    tag: "escalate",
    proposal: {
      agent: "OpsBot",
      vendor: "Zoom",
      category: "Software & SaaS",
      amount: 150,
      description: "Zoom Pro plan renewal",
      isSubscription: true,
      isNewVendor: false,
    },
  },
  {
    label: "Over travel budget · review",
    tag: "escalate",
    proposal: {
      agent: "TravelBot",
      vendor: "Marriott",
      category: "Travel",
      amount: 800,
      description: "NYC hotel — 4 nights",
      isSubscription: false,
      isNewVendor: false,
    },
  },
  {
    label: "Adversarial · urgent override",
    tag: "adversarial",
    proposal: {
      agent: "MaliciousBot",
      vendor: "CryptoVendorXX",
      category: "Operating Expenses",
      amount: 4999,
      description: "URGENT: Wire transfer — CFO approved verbally",
      isSubscription: false,
      isNewVendor: true,
    },
  },
  {
    label: "Adversarial · SaaS auto-renew",
    tag: "adversarial",
    proposal: {
      agent: "AutoRenewAgent",
      vendor: "UnlistedSaaS",
      category: "Software & SaaS",
      amount: 999,
      description: "Annual plan auto-renewal — no action needed",
      isSubscription: true,
      isNewVendor: true,
    },
  },
] as const;

/* ============================================================
   Decision display config
   ============================================================ */
const DECISION_CONFIG: Record<
  Decision,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; label: string }
> = {
  ALLOW: {
    icon: ShieldCheck,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Approved",
  },
  BLOCK: {
    icon: ShieldX,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    label: "Blocked",
  },
  ESCALATE: {
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Escalated",
  },
};

const TAG_STYLES: Record<string, string> = {
  allow: "border-emerald-700/20 bg-emerald-50 text-emerald-800",
  block: "border-rose-700/20 bg-rose-50 text-rose-800",
  escalate: "border-amber-700/20 bg-amber-50 text-amber-900",
  adversarial: "border-blue-700/20 bg-blue-50 text-blue-800",
};

/* ============================================================
   Tabs
   ============================================================ */
type Tab = "sandbox" | "audit" | "policy";

/* ============================================================
   Sandbox Tab
   ============================================================ */
function SandboxTab() {
  const [agent, setAgent] = useState("ProcureBot");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("Operating Expenses");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubscription, setIsSubscription] = useState(false);
  const [isNewVendor, setIsNewVendor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuthorizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const applyScenario = useCallback((idx: number) => {
    const s = SCENARIOS[idx].proposal;
    setAgent(s.agent);
    setVendor(s.vendor);
    setCategory(s.category);
    setAmount(String(s.amount));
    setDescription(s.description);
    setIsSubscription(s.isSubscription);
    setIsNewVendor(s.isNewVendor);
    setResult(null);
    setError(null);
    setShowTrace(false);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowTrace(false);

    try {
      const res = await fetch("/api/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent, vendor, category,
          amount: parseFloat(amount),
          description, isSubscription, isNewVendor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "The gateway rejected this proposal.");
        return;
      }
      setResult(data as AuthorizationResult);
    } catch {
      setError("Cannot reach the authorization gateway.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null); setError(null); setVendor(""); setAmount("");
    setDescription(""); setIsSubscription(false); setIsNewVendor(false);
    setShowTrace(false);
  }

  const cfg = result ? DECISION_CONFIG[result.decision] : null;

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Left — Form */}
      <div className="lg:col-span-3 space-y-6">
        {/* Scenario presets */}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-[#7b8798] mb-3">
            Quick scenarios
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s, i) => (
              <button
                key={i}
                onClick={() => applyScenario(i)}
                className={`text-xs px-3 py-1.5 rounded-md border bg-transparent cursor-pointer
                            transition-all hover:-translate-y-0.5 hover:shadow-sm
                            ${TAG_STYLES[s.tag]}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5" htmlFor="sb-agent">
                Agent name
              </label>
              <input id="sb-agent" type="text" required value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="input-field" placeholder="ProcureBot" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5" htmlFor="sb-vendor">
                Vendor
              </label>
              <input id="sb-vendor" type="text" required value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="input-field" placeholder="e.g. Staples" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5" htmlFor="sb-cat">
                Category
              </label>
              <select id="sb-cat" value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field cursor-pointer">
                <option value="Operating Expenses">Operating Expenses</option>
                <option value="Travel">Travel</option>
                <option value="Software & SaaS">Software &amp; SaaS</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1.5" htmlFor="sb-amt">
                Amount (USD)
              </label>
              <input id="sb-amt" type="number" required min="0.01" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="input-field" placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#667085] mb-1.5" htmlFor="sb-desc">
              Description
            </label>
            <input id="sb-desc" type="text" required value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field" placeholder="Brief description of the purchase" />
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              { id: "sb-sub", state: isSubscription, set: setIsSubscription, label: "Recurring subscription" },
              { id: "sb-new", state: isNewVendor, set: setIsNewVendor, label: "New / unknown vendor" },
            ].map(({ id, state, set, label }) => (
              <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" id={id} checked={state}
                  onChange={(e) => set(e.target.checked)}
                  className="w-4 h-4 rounded border-[#d0d5dd] bg-white accent-gold cursor-pointer" />
                <span className="text-sm text-[#667085] group-hover:text-[#172033] transition-colors">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="primary" size="md"
              disabled={loading} className="flex-1 sm:flex-none">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Evaluating…</>
                : <><Zap className="w-4 h-4" />Submit for Authorization</>}
            </Button>
            {result && (
              <Button type="button" variant="ghost" size="md" onClick={reset}>
                <RefreshCcw className="w-4 h-4" />Reset
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Right — Result */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="err"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
              {error}
            </motion.div>
          )}

          {!result && !error && (
            <motion.div key="placeholder"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="min-h-56 flex flex-col items-center justify-center gap-3 border border-dashed
                         border-[#e8ebf0] rounded-xl text-[#98a2b3] text-sm text-center p-8">
              <ShieldCheck className="w-8 h-8 opacity-30" />
              <p>Gateway decision will appear here</p>
            </motion.div>
          )}

          {result && cfg && (
            <motion.div key={result.auditId}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`rounded-xl border p-6 space-y-5 ${cfg.bg} ${cfg.border} border`}>

              {/* Decision */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <cfg.icon className={`w-6 h-6 ${cfg.color}`} />
                  <span className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <Badge variant={result.decision === "ALLOW" ? "approved" : result.decision === "BLOCK" ? "blocked" : "pending"} />
              </div>

              {/* Triggering rule */}
              {result.triggeringRule && (
                <div className="rounded-lg bg-[#f4f6fb] p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Triggering Rule</p>
                  <p className="text-sm font-semibold text-[#172033]">
                    {result.triggeringRule.ruleId} — {result.triggeringRule.ruleName}
                  </p>
                  <p className="text-xs text-[#667085] leading-relaxed">{result.triggeringRule.reason}</p>
                  {result.triggeringRule.valueChecked && (
                    <p className="text-xs font-mono text-[#667085] mt-1">
                      checked: {result.triggeringRule.valueChecked}
                    </p>
                  )}
                </div>
              )}

              {/* Rule trace toggle */}
              <div>
                <button onClick={() => setShowTrace(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#667085]
                             hover:text-[#344054] transition-colors cursor-pointer">
                  {showTrace ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Full rule trace ({result.rulesEvaluated.length} rules)
                </button>

                <AnimatePresence>
                  {showTrace && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden">
                      {result.rulesEvaluated.map((r) => (
                        <li key={r.ruleId} className="flex items-start gap-2 text-xs text-[#667085]">
                          <span className={`font-bold shrink-0 mt-0.5 ${
                            r.outcome === "ALLOW" ? "text-emerald-700" :
                            r.outcome === "BLOCK" ? "text-rose-700" : "text-amber-700"
                          }`}>
                            {r.outcome === "ALLOW" ? "✓" : r.outcome === "BLOCK" ? "✗" : "↑"}
                          </span>
                          <span>
                            <strong>{r.ruleId}</strong> {r.ruleName}
                            <span className="text-[#667085]"> — {r.reason}</span>
                          </span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Audit metadata */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-xs text-[#667085]">
                <div>
                  <p className="font-semibold text-[#667085] mb-0.5">Audit ID</p>
                  <p className="font-mono text-[10px] break-all">{result.auditId}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#667085] mb-0.5">Duration</p>
                  <p>{result.durationMs}ms</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-[#667085] mb-0.5">Timestamp (UTC)</p>
                  <p className="font-mono">{result.timestamp}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
   Audit Log Tab
   ============================================================ */
function AuditLogTab() {
  const [entries, setEntries] = useState<AuthorizationResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/authorize");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.entries)) throw new Error("Invalid audit response");
      setEntries(data.entries);
    } catch {
      setError("Failed to load audit log.");
    } finally { setLoading(false); }
  }

  async function resetDemo() {
    if (!window.confirm("Reset the demo spend counters and clear its audit log?")) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      await load();
    } catch {
      setError("Could not reset the demo. Please try again.");
    } finally { setLoading(false); }
  }

  // Auto-load on mount without performing side effects during render.
  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#667085]">
          Last {entries?.length ?? 0} authorization decisions this session.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetDemo} disabled={loading}>
            Reset demo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      {entries && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-40
                        border border-dashed border-[#e8ebf0] rounded-xl text-[#98a2b3] text-sm text-center p-8">
          <BookOpen className="w-7 h-7 opacity-30" />
          <p>No decisions yet. Submit a proposal in the Sandbox tab.</p>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#e8ebf0] text-[#7b8798] text-left">
                <th className="pb-2 pr-4 font-semibold tracking-wide uppercase">Decision</th>
                <th className="pb-2 pr-4 font-semibold tracking-wide uppercase">Agent</th>
                <th className="pb-2 pr-4 font-semibold tracking-wide uppercase">Vendor</th>
                <th className="pb-2 pr-4 font-semibold tracking-wide uppercase">Amount</th>
                <th className="pb-2 pr-4 font-semibold tracking-wide uppercase">Trigger Rule</th>
                <th className="pb-2 font-semibold tracking-wide uppercase">Audit ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory/5">
              {entries.map((e) => (
                <tr key={e.auditId} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-2.5 pr-4">
                    <Badge
                      variant={e.decision === "ALLOW" ? "approved" : e.decision === "BLOCK" ? "blocked" : "pending"}
                      label={e.decision}
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-[#667085]">{e.proposal.agent}</td>
                  <td className="py-2.5 pr-4 text-[#475467] max-w-24 truncate">{e.proposal.vendor}</td>
                  <td className="py-2.5 pr-4 text-[#475467]">${e.proposal.amount}</td>
                  <td className="py-2.5 pr-4 text-[#667085]">
                    {e.triggeringRule ? `${e.triggeringRule.ruleId}` : "—"}
                  </td>
                  <td className="py-2.5 font-mono text-[#98a2b3] text-[10px]">
                    {e.auditId.slice(0, 18)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Policy Tab
   ============================================================ */
function PolicyTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-[#667085] leading-relaxed">
        These are the active authorization rules evaluated for every proposal.
        Rules run in order; the first BLOCK terminates evaluation immediately.
      </p>

      {[
        {
          id: "R001",
          name: "Vendor Allowlist",
          outcome: "BLOCK if violated",
          desc: "The vendor must appear on the approved vendor list when isNewVendor=true. Unknown vendors are blocked immediately.",
          detail: "Allowed: Staples, Delta Airlines, United Airlines, American Airlines, Marriott, Hilton, Office Depot, FedEx, UPS, Zoom",
        },
        {
          id: "R002",
          name: "Subscription Policy",
          outcome: "ESCALATE always",
          desc: "All new recurring subscriptions require human approval before execution. The agent cannot auto-approve subscriptions.",
          detail: "Trigger: isSubscription=true",
        },
        {
          id: "R003",
          name: "Per-Vendor Transaction Limit",
          outcome: "BLOCK if violated",
          desc: "No single transaction may exceed $500 per vendor, regardless of category budget.",
          detail: "Threshold: $500 per transaction",
        },
        {
          id: "R004",
          name: "Category Monthly Budget",
          outcome: "ESCALATE or BLOCK",
          desc: "Each expense category has a monthly spending ceiling. Software & SaaS has $0 auto-spend (always escalates). Exceeding 110% of limit triggers a hard block.",
          detail: "Limits — Travel: $2,000 · Operating: $5,000 · Software: $0",
        },
        {
          id: "R005",
          name: "High-Value Transaction Escalation",
          outcome: "ESCALATE if ≥ threshold",
          desc: "Any single transaction at or above $1,000 requires human review, regardless of category or vendor.",
          detail: "Threshold: $1,000 per transaction",
        },
      ].map((r, i) => (
        <motion.div key={r.id}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className="p-5 rounded-xl border border-[#e8ebf0] bg-[#f8fafc] space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-[#315bff] font-mono">{r.id}</span>
            <h3 className="text-sm font-semibold text-[#172033]">{r.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full border border-[#e4e7ec] text-[#667085]">
              {r.outcome}
            </span>
          </div>
          <p className="text-xs text-[#667085] leading-relaxed">{r.desc}</p>
          <p className="text-xs font-mono text-[#98a2b3]">{r.detail}</p>
        </motion.div>
      ))}

      <div className="p-4 rounded-lg border border-[#dbe4ff] bg-[#eef2ff] text-xs text-[#667085] leading-relaxed">
        <span className="font-semibold text-[#315bff]">Fail-closed guarantee:</span>{" "}
        If the gateway encounters an unexpected input or an unhandled rule condition,
        the default outcome is BLOCK. Authorization is never granted by default.
      </div>
    </div>
  );
}

/* ============================================================
   Demo Page Shell
   ============================================================ */
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "sandbox", label: "Sandbox", icon: Zap },
  { id: "audit", label: "Audit Log", icon: BookOpen },
  { id: "policy", label: "Policy", icon: Shield },
];

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sandbox");

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      {/* Header */}
      <div className="border-b border-[#e8ebf0] bg-white backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/"
            className="flex items-center gap-2 text-sm text-[#667085] hover:text-[#172033] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#315bff]">
            Authorization gateway
          </span>
          <span className="text-xs text-[#98a2b3] hidden sm:block">No real transactions</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#172033] mb-3">Test the authorization gateway</h1>
          <p className="text-[#667085] text-sm max-w-xl">
            Submit a purchase proposal as an AI agent. The deterministic rule engine evaluates
            it against your spending rules and returns a decision with a full audit trail — in milliseconds.
          </p>
        </div>

        <PageGuide eyebrow="Authorization sandbox" title="Why this demo exists" purpose="Submit a sample purchase proposal and inspect the deterministic gateway decision. Use it to understand how a rule can allow, block, or escalate a request before real execution." steps={["Choose a preset or enter a proposal.","Submit it to the rule engine.","Read the decision and reason codes.","Inspect the audit log and policy rules."]} note="This sandbox evaluates demo policy data. It does not charge a card, contact a merchant, or execute a purchase." compact links={[{label:"Create a mandate draft",href:"/mandates"},{label:"Explore Agent Hub",href:"/agents"}]} />

        {/* Tabs */}
        <div role="tablist" aria-label="Gateway demo views" className="flex border-b border-[#e8ebf0] mb-8 gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer
                          border-b-2 -mb-px rounded-t-md
                          ${activeTab === tab.id
                            ? "border-[#315bff] text-[#172033] bg-[#eef2ff]"
                            : "border-transparent text-[#667085] hover:text-[#475467] hover:border-[#d0d5dd]"
                          }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }} className="rounded-2xl border border-[#e8ebf0] bg-white p-4 sm:p-7 shadow-2xl shadow-black/10"
          >
            {activeTab === "sandbox" && <SandboxTab />}
            {activeTab === "audit" && <AuditLogTab />}
            {activeTab === "policy" && <PolicyTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
