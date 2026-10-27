"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, LockKeyhole, Plus, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { PageGuide } from "@/components/ui/PageGuide";

type Mandate = {
  id: string; name: string; purpose: string; maxPerTransaction: number | null; monthlyBudget: number | null;
  currency: "INR" | "USD"; allowedMerchants: string[]; blockedMerchants: string[]; categories: string[]; blockedCategories: string[];
  approvalAbove: number | null; expiresInDays: number | null; confidence: "high" | "medium" | "low"; needsClarification: string[];
  createdAt: string;
};
const STORAGE_KEY = "veltrio-mandates-v1";
const examples = [
  "Allow my shopping agent to buy electronics under ₹5,000 per purchase, with a monthly budget of ₹12,000. Ask me to approve anything above ₹3,000. Valid for 30 days.",
  "Only allow groceries from BigBasket and Amazon Fresh, max ₹2,000 per order, block subscriptions, and ask for approval above ₹1,000.",
  "Allow work software purchases up to $50 per transaction. Require approval for anything above $25."
];
const money = (n: number | null, currency: string) => n == null ? "Not specified" : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export default function MandatesClient() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Omit<Mandate, "id" | "createdAt"> | null>(null);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [parserMode, setParserMode] = useState("deterministic-v1");
  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setMandates(JSON.parse(raw)); } catch { /* keep empty state */ } }, []);
  function persist(next: Mandate[]) { setMandates(next); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setError("Browser storage is unavailable; this mandate may not persist after reload."); } }
  async function parse(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (text.trim().length < 8) { setError("Describe the spending rules in a little more detail."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/mandates/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't parse this mandate.");
      setDraft(data.mandate);
      setParserMode(typeof data.parser === "string" ? data.parser : "deterministic-v1");
      setNotice(data.aiAssisted ? "Gemini-assisted extraction completed. Review every field before saving." : "Deterministic fallback used. Configure GEMINI_API_KEY for AI-assisted extraction.");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't parse this mandate."); }
    finally { setLoading(false); }
  }
  function saveMandate() {
    if (!draft) return;
    const item: Mandate = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    persist([item, ...mandates]); setDraft(null); setText(""); setNotice("Mandate saved in this browser. Review it before relying on it.");
  }
  function removeMandate(id: string) { persist(mandates.filter(m => m.id !== id)); }
  return <main className="min-h-screen bg-[#f6f7fb] px-4 pb-16 pt-24 text-[#172033] sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><Link href="/agents" className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#667085] hover:text-[#315bff]"><ArrowLeft size={14}/> Back to Agent Hub</Link>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#315bff]"><ShieldCheck size={14}/> Control before checkout</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Spending mandates</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">Describe your purchase rules in plain language. Veltrio extracts a structured draft for you to review before saving.</p>
        </div>
        <div className="rounded-2xl border border-[#dfe4eb] bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold"><LockKeyhole size={15} className="text-[#315bff]"/> You stay in control</div><p className="mt-2 max-w-[240px] text-xs leading-5 text-[#667085]">Mandates are saved in this browser only. They are not yet enforced by the payment gateway.</p></div>
      </div>
      <PageGuide eyebrow="Spending policy" title="Why mandates exist" purpose="A mandate turns broad instructions into visible limits and restrictions so a person can review them before an agent proposes a purchase. It is the policy-design step, not payment execution." steps={["Describe the allowed spend in plain language.","Inspect extracted limits and merchant rules.","Correct anything that was misunderstood.","Save the reviewed draft in this browser."]} note="Mandates are currently browser-local and are not enforced by the authorization gateway. Treat them as drafts, not active financial controls." compact links={[{label:"Test the gateway separately",href:"/demo"},{label:"Return to Agent Hub",href:"/agents"}]} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-[0_10px_35px_rgba(16,24,40,.04)] sm:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef2ff] text-[#315bff]"><WalletCards size={20}/></span><div><h2 className="text-lg font-semibold">Create from natural language</h2><p className="text-xs text-[#667085]">Write rules the way you would tell a trusted assistant.</p></div></div>
          <form onSubmit={parse}>
            <label htmlFor="mandate-text" className="mb-2 block text-xs font-semibold text-[#344054]">Your purchase instructions</label>
            <textarea id="mandate-text" value={text} onChange={e=>setText(e.target.value)} rows={5} maxLength={1200} placeholder="Example: Allow my shopping agent to spend up to ₹3,000 per purchase on electronics. Ask me before anything above ₹2,000. Limit monthly spending to ₹10,000 and expire after 30 days." className="w-full resize-y rounded-2xl border border-[#d0d5dd] bg-white p-4 text-sm leading-6 outline-none transition focus:border-[#315bff] focus:ring-4 focus:ring-[#315bff]/10"/>
            <div className="mt-2 flex justify-between text-[11px] text-[#98a2b3]"><span>Plain language · 8–1,200 characters</span><span>{text.length}/1200</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{examples.map((example,i)=><button key={example} type="button" onClick={()=>setText(example)} className="rounded-full border border-[#e4e7ec] bg-[#fafbfc] px-3 py-2 text-left text-[11px] text-[#475467] transition hover:border-[#b8c5ff] hover:bg-[#f2f5ff]">Example {i+1}</button>)}</div>
            {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700"><CircleAlert size={15} className="mt-0.5 shrink-0"/>{error}</p>}
            <button type="submit" disabled={loading || text.trim().length<8} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#315bff] px-4 text-sm font-semibold text-white transition hover:bg-[#2446d8] disabled:cursor-not-allowed disabled:opacity-50">{loading?"Interpreting rules…":<>Generate mandate draft <ArrowRight size={16}/></>}</button>
          </form>
        </section>
        <section className="rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-[0_10px_35px_rgba(16,24,40,.04)] sm:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Check size={20}/></span><div><h2 className="text-lg font-semibold">Review before saving</h2><p className="text-xs text-[#667085]">Nothing is active until you confirm the draft.</p><p className="mt-1 text-[10px] font-medium text-[#315bff]">Parser: {parserMode === "gemini-2.5-flash" ? "Gemini AI-assisted" : "Deterministic fallback"}</p></div></div>
          {!draft ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#d0d5dd] bg-[#fafbfc] p-6 text-center"><div><ShieldCheck size={30} className="mx-auto text-[#98a2b3]"/><p className="mt-3 text-sm font-medium text-[#475467]">Your structured rules will appear here</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#98a2b3]">Create a draft to inspect the budget, merchant restrictions, approval threshold, and expiry.</p></div></div> :
          <div><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">{draft.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{draft.purpose}</p></div><span className={"shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase "+(draft.confidence==="high"?"bg-emerald-50 text-emerald-700":draft.confidence==="medium"?"bg-amber-50 text-amber-700":"bg-rose-50 text-rose-700")}>{draft.confidence} confidence</span></div>
            <dl className="mt-5 grid grid-cols-2 gap-3">{[
              ["Per purchase",money(draft.maxPerTransaction,draft.currency)],["Monthly budget",money(draft.monthlyBudget,draft.currency)],["Approval above",money(draft.approvalAbove,draft.currency)],["Expires after",draft.expiresInDays?draft.expiresInDays+" days":"Not specified"]
            ].map(([label,value])=><div key={label} className="rounded-xl border border-[#edf0f4] bg-[#fafbfc] p-3"><dt className="text-[10px] font-medium uppercase tracking-wider text-[#98a2b3]">{label}</dt><dd className="mt-1 text-sm font-semibold text-[#172033]">{value}</dd></div>)}</dl>
            <div className="mt-4 space-y-3">{[["Categories mentioned",draft.categories],["Blocked categories",draft.blockedCategories],["Allowed merchants",draft.allowedMerchants],["Blocked merchants",draft.blockedMerchants]].map(([label,values])=><div key={label as string}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">{label}</p><div className="flex flex-wrap gap-1.5">{(values as string[]).length?(values as string[]).map(value=><span key={value} className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] text-[#315bff]">{value}</span>):<span className="text-xs text-[#98a2b3]">None detected</span>}</div></div>)}</div>
            {!!draft.needsClarification.length&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="mb-1 flex items-center gap-2 text-xs font-semibold text-amber-800"><CircleAlert size={14}/> Please clarify</p>{draft.needsClarification.map(item=><p key={item} className="text-xs leading-5 text-amber-800">{item}</p>)}</div>}
            <button onClick={saveMandate} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 text-sm font-semibold text-white transition hover:bg-[#26334b]"><Check size={16}/> Save mandate locally</button>
            <p className="mt-2 text-[10px] leading-4 text-[#98a2b3]">Saving does not activate gateway enforcement. Confirm all extracted values before use.</p>
          </div>}
        </section>
      </div>
      <section className="mt-8 rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Saved mandates</h2><p className="mt-1 text-xs text-[#667085]">{mandates.length} saved in this browser</p></div><span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[10px] font-semibold text-[#667085]"><Clock3 size={13}/> Local prototype</span></div>
        {!mandates.length?<div className="rounded-2xl border border-dashed border-[#d0d5dd] p-8 text-center text-sm text-[#98a2b3]">No mandates saved yet. Create a draft above to get started.</div>:<div className="grid gap-3 md:grid-cols-2">{mandates.map(m=><article key={m.id} className="rounded-2xl border border-[#e4e7ec] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{m.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{m.purpose}</p></div><button onClick={()=>removeMandate(m.id)} aria-label={"Delete "+m.name} className="rounded-lg p-2 text-[#98a2b3] hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button></div><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-lg bg-[#f2f4f7] px-2.5 py-1.5">Per purchase: {money(m.maxPerTransaction,m.currency)}</span><span className="rounded-lg bg-[#f2f4f7] px-2.5 py-1.5">Monthly: {money(m.monthlyBudget,m.currency)}</span></div></article>)}</div>}
      </section>
      {notice&&<div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#172033] px-4 py-3 text-xs text-white shadow-xl">{notice}</div>}
      <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-5 text-[#98a2b3]">This is a deterministic extraction prototype, not an LLM interpretation engine. Rules are reviewable, browser-local, and not yet enforced by the authorization gateway.</p>
    </div>
  </main>;
}
