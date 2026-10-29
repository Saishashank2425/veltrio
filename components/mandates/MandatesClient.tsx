"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, LockKeyhole, ShieldCheck, Trash2, WalletCards, Sparkles, PencilLine } from "lucide-react";

type Mandate = {
  id: string; name: string; purpose: string; maxPerTransaction: number | null; monthlyBudget: number | null;
  currency: "INR" | "USD"; allowedMerchants: string[]; blockedMerchants: string[]; categories: string[]; blockedCategories: string[];
  approvalAbove: number | null; expiresInDays: number | null; confidence: "high" | "medium" | "low"; needsClarification: string[];
  createdAt: string;
};
type Draft = Omit<Mandate, "id" | "createdAt">;
const STORAGE_KEY = "veltrio-mandates-v1";
const examples = [
  { title: "Everyday shopping", text: "Allow shopping purchases up to ₹3,000 each, with a total monthly budget of ₹10,000. Ask me before purchases above ₹2,000. Valid for 30 days." },
  { title: "Groceries only", text: "Only allow groceries from BigBasket and Amazon Fresh, up to ₹2,000 per order. Block subscriptions and ask me before purchases above ₹1,000. Valid for 30 days." },
  { title: "Work software", text: "Allow work software purchases up to $50 each. Ask me before purchases above $25. Valid for 30 days." }
];
const money = (n: number | null, currency: string) => n == null ? "Not set" : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
const amountInput = (value: number | null) => value == null ? "" : String(value);
const parseAmount = (value: string) => value.trim() === "" ? null : Number(value);

export default function MandatesClient() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [parserMode, setParserMode] = useState("deterministic-v1");
  const [fallbackReason, setFallbackReason] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMandates(JSON.parse(raw));
    } catch { setError("Saved items could not be loaded from this browser."); }
    finally { setStorageReady(true); }
  }, []);

  function persist(next: Mandate[]) {
    setMandates(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { setError("Browser storage is unavailable. Your changes may not remain after you leave this page."); }
  }

  async function parse(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice(""); setDraft(null); setFallbackReason("");
    if (text.trim().length < 8) { setError("Tell us a little more about what your agent can buy."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/mandates/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't understand those instructions. Try a simpler example.");
      const parsed = data.mandate as Draft;
      if (!parsed || typeof parsed !== "object") throw new Error("We couldn't create a draft. Please try again.");
      setDraft(parsed);
      setParserMode(typeof data.parser === "string" ? data.parser : "deterministic-v1");
      setFallbackReason(typeof data.fallbackReason === "string" ? data.fallbackReason : "");
      setNotice(data.aiAssisted ? "Gemini responded successfully. Please check the amounts and restrictions before saving." : "Gemini was not used for this draft. Check the fields carefully before saving.");
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't create a draft. Please try again."); }
    finally { setLoading(false); }
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => current ? { ...current, [key]: value } : current);
  }

  function saveMandate() {
    if (!draft) return;
    const invalidAmount = [draft.maxPerTransaction, draft.monthlyBudget, draft.approvalAbove].some(n => n !== null && (!Number.isFinite(n) || n <= 0));
    if (invalidAmount) { setError("Amounts must be greater than zero, or left blank."); return; }
    if (draft.maxPerTransaction !== null && draft.approvalAbove !== null && draft.approvalAbove > draft.maxPerTransaction) {
      setError("Your approval amount is higher than the purchase limit. Lower it or edit the purchase limit."); return;
    }
    if (!draft.maxPerTransaction && !draft.monthlyBudget) { setError("Add a per-purchase limit or a monthly budget before saving."); return; }
    if (draft.needsClarification.length) { setError("Please resolve the clarification notes before saving this draft."); return; }
    const item: Mandate = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    persist([item, ...mandates]); setDraft(null); setText(""); setError("");
    setNotice("Saved on this browser. This is a draft, not an active payment control.");
  }

  function removeMandate(id: string) { persist(mandates.filter(m => m.id !== id)); }
  const isAi = parserMode === "gemini-2.5-flash";

  return <main className="min-h-screen bg-[#f6f7fb] px-4 pb-16 pt-24 text-[#172033] sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/agents" className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#667085] hover:text-[#315bff]"><ArrowLeft size={14}/> Back to Agent Hub</Link>
      <header className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#315bff]"><ShieldCheck size={14}/> Your rules, your money</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Set your spending rules</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">Tell Veltrio what your shopping assistant is allowed to buy. We’ll turn your words into a simple checklist for you to review.</p>
        </div>
        <div className="flex max-w-md gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <LockKeyhole size={18} className="mt-0.5 shrink-0 text-amber-700"/>
          <div><p className="text-xs font-semibold text-amber-900">Important: these are saved drafts</p><p className="mt-1 text-xs leading-5 text-amber-800">This prototype saves rules in this browser. They do not yet control the live payment gateway.</p></div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
        <section className="rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-[0_10px_35px_rgba(16,24,40,.04)] sm:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef2ff] text-[#315bff]"><WalletCards size={20}/></span><div><h2 className="text-lg font-semibold">1. Tell us what you want</h2><p className="text-xs text-[#667085]">No forms or technical terms needed.</p></div></div>
          <form onSubmit={parse}>
            <label htmlFor="mandate-text" className="mb-2 block text-sm font-semibold text-[#344054]">What should your shopping assistant be allowed to do?</label>
            <textarea id="mandate-text" value={text} onChange={e => setText(e.target.value)} rows={6} maxLength={1200} placeholder="For example: Let my shopping assistant buy groceries for up to ₹2,000 per order. Never buy subscriptions. Ask me before anything over ₹1,000. Stop after 30 days." className="w-full resize-y rounded-2xl border border-[#d0d5dd] bg-white p-4 text-sm leading-6 outline-none transition focus:border-[#315bff] focus:ring-4 focus:ring-[#315bff]/10"/>
            <div className="mt-2 flex justify-between text-[11px] text-[#98a2b3]"><span>Write it in your own words</span><span>{text.length}/1200</span></div>
            <p className="mb-2 mt-5 text-xs font-semibold text-[#475467]">Or start with an example</p>
            <div className="grid gap-2 sm:grid-cols-3">{examples.map(example => <button key={example.title} type="button" onClick={() => { setText(example.text); setError(""); }} className="rounded-xl border border-[#e4e7ec] bg-[#fafbfc] p-3 text-left transition hover:border-[#b8c5ff] hover:bg-[#f2f5ff]"><span className="block text-xs font-semibold text-[#344054]">{example.title}</span><span className="mt-1 block text-[11px] leading-4 text-[#667085]">Use this as a starting point</span></button>)}</div>
            {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700"><CircleAlert size={15} className="mt-0.5 shrink-0"/>{error}</p>}
            <button type="submit" disabled={loading || text.trim().length < 8} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#315bff] px-4 text-sm font-semibold text-white transition hover:bg-[#2446d8] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><Sparkles size={16} className="animate-pulse"/> Understanding your rules…</> : <>Turn my words into rules <ArrowRight size={16}/></>}</button>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#98a2b3]">You’ll get a chance to review and correct everything before saving.</p>
          </form>
        </section>

        <section className="rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-[0_10px_35px_rgba(16,24,40,.04)] sm:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Check size={20}/></span><div><h2 className="text-lg font-semibold">2. Check your rules</h2><p className="text-xs text-[#667085]">Tap any amount to correct it before saving.</p></div></div>
          {!draft ? <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#d0d5dd] bg-[#fafbfc] p-6 text-center"><div><PencilLine size={28} className="mx-auto text-[#98a2b3]"/><p className="mt-3 text-sm font-semibold text-[#475467]">Your rule summary will appear here</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#98a2b3]">Start with a sentence on the left. We’ll do the extraction, then you can review the details.</p></div></div> :
          <div>
            <div className="rounded-2xl bg-[#f7f8ff] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#315bff]"><Sparkles size={14}/>{isAi ? "AI-assisted draft" : "Basic draft"}</div><h3 className="mt-2 text-base font-semibold">{draft.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{draft.purpose}</p></div>
            {!isAi && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Gemini is not connected for this request.</strong> {fallbackReason || "A deterministic fallback parser created this draft."} Please review every field manually.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-[#e4e7ec] p-3"><span className="block text-[11px] font-medium text-[#667085]">Maximum per purchase ({draft.currency})</span><input aria-label="Maximum per purchase" type="number" min="1" step="any" value={amountInput(draft.maxPerTransaction)} onChange={e => updateDraft("maxPerTransaction", parseAmount(e.target.value))} placeholder="Set a limit" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm font-semibold outline-none focus:border-[#315bff]"/></label>
              <label className="rounded-xl border border-[#e4e7ec] p-3"><span className="block text-[11px] font-medium text-[#667085]">Total monthly budget ({draft.currency})</span><input aria-label="Monthly budget" type="number" min="1" step="any" value={amountInput(draft.monthlyBudget)} onChange={e => updateDraft("monthlyBudget", parseAmount(e.target.value))} placeholder="Optional limit" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm font-semibold outline-none focus:border-[#315bff]"/></label>
              <label className="rounded-xl border border-[#e4e7ec] p-3"><span className="block text-[11px] font-medium text-[#667085]">Ask me before spending above ({draft.currency})</span><input aria-label="Approval threshold" type="number" min="1" step="any" value={amountInput(draft.approvalAbove)} onChange={e => updateDraft("approvalAbove", parseAmount(e.target.value))} placeholder="Optional approval" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm font-semibold outline-none focus:border-[#315bff]"/></label>
              <label className="rounded-xl border border-[#e4e7ec] p-3"><span className="block text-[11px] font-medium text-[#667085]">Stop this rule after</span><select aria-label="Expiry" value={draft.expiresInDays ?? ""} onChange={e => updateDraft("expiresInDays", e.target.value ? Number(e.target.value) : null)} className="mt-2 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#315bff]"><option value="">No expiry specified</option><option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></select></label>
            </div>
            <div className="mt-4 space-y-3">
              <div><p className="mb-1 text-xs font-semibold text-[#344054]">Allowed shops</p><p className="text-xs leading-5 text-[#667085]">{draft.allowedMerchants.length ? draft.allowedMerchants.join(", ") : "No shop restrictions detected."}</p></div>
              <div><p className="mb-1 text-xs font-semibold text-[#344054]">Blocked shops</p><p className="text-xs leading-5 text-[#667085]">{draft.blockedMerchants.length ? draft.blockedMerchants.join(", ") : "No blocked shops detected."}</p></div>
              <div><p className="mb-1 text-xs font-semibold text-[#344054]">Allowed categories</p><div className="flex flex-wrap gap-1.5">{draft.categories.length ? draft.categories.map(value => <span key={value} className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] text-[#315bff]">{value}</span>) : <span className="text-xs text-[#98a2b3]">No category detected</span>}</div></div>
              <div><p className="mb-1 text-xs font-semibold text-[#344054]">Blocked categories</p><div className="flex flex-wrap gap-1.5">{draft.blockedCategories.length ? draft.blockedCategories.map(value => <span key={value} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">{value}</span>) : <span className="text-xs text-[#98a2b3]">None detected</span>}</div></div>
            </div>
            {!!draft.needsClarification.length && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="mb-1 flex items-center gap-2 text-xs font-semibold text-amber-800"><CircleAlert size={14}/> One thing to check</p>{draft.needsClarification.map(item => <p key={item} className="text-xs leading-5 text-amber-800">{item}</p>)}</div>}
            <button onClick={saveMandate} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 text-sm font-semibold text-white transition hover:bg-[#26334b]"><Check size={16}/> Save my rules</button>
            <button onClick={() => { setDraft(null); setError(""); }} className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-[#667085] hover:bg-[#f2f4f7]">Start over</button>
            <p className="mt-2 text-center text-[10px] leading-4 text-[#98a2b3]">Saving keeps a copy in this browser only. It does not activate payment protection.</p>
          </div>}
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-[#e4e7ec] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your saved rules</h2><p className="mt-1 text-xs text-[#667085]">{storageReady ? mandates.length + (mandates.length === 1 ? " saved rule" : " saved rules") : "Loading saved rules…"}</p></div><span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[10px] font-semibold text-[#667085]"><Clock3 size={13}/> Saved on this browser</span></div>
        {!mandates.length ? <div className="rounded-2xl border border-dashed border-[#d0d5dd] p-8 text-center"><p className="text-sm font-medium text-[#475467]">No saved rules yet</p><p className="mt-1 text-xs text-[#98a2b3]">Once you create and review a rule, it will appear here.</p></div> :
        <div className="grid gap-3 md:grid-cols-2">{mandates.map(m => <article key={m.id} className="rounded-2xl border border-[#e4e7ec] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{m.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{m.purpose}</p></div><button onClick={() => removeMandate(m.id)} aria-label={"Delete " + m.name} className="rounded-lg p-2 text-[#98a2b3] hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button></div><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-lg bg-[#f2f4f7] px-2.5 py-1.5">Per purchase: {money(m.maxPerTransaction, m.currency)}</span><span className="rounded-lg bg-[#f2f4f7] px-2.5 py-1.5">Monthly: {money(m.monthlyBudget, m.currency)}</span></div><p className="mt-3 text-[10px] font-semibold text-amber-700">Draft only · Not enforced at checkout</p></article>)}</div>}
      </section>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/agents" className="inline-flex items-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-4 py-2.5 text-xs font-semibold text-[#344054] hover:bg-[#f9fafb]"><ArrowLeft size={14}/> Back to shopping assistant</Link><Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#26334b]">Explore the gateway demo <ArrowRight size={14}/></Link></div>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#172033] px-4 py-3 text-xs text-white shadow-xl">{notice}</div>}
    </div>
  </main>;
}