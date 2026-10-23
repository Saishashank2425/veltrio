"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, CalendarClock, CreditCard,
  FileUp, Plus, Search, Trash2, Wallet, Repeat2, ReceiptText,
  CheckCircle2, AlertCircle, X, Download,
} from "lucide-react";
import {
  CATEGORIES, KIND_LABELS, STORAGE_KEY, annualEquivalent, formatINR,
  isFutureDate, monthlyEquivalent, parseTransactionCsv, isLikelyDuplicate,
  type FinancialRecord, type RecordKind, type RecordStatus,
} from "@/lib/finance";

type Draft = {
  kind: RecordKind;
  name: string;
  amount: string;
  currency: string;
  date: string;
  category: string;
  transactionType: "income" | "expense" | "refund" | "transfer";
  status: RecordStatus;
  frequency: NonNullable<FinancialRecord["frequency"]>;
  nextDate: string;
  provider: string;
  issuer: string;
  lastFour: string;
  creditLimit: string;
  outstanding: string;
  statementBalance: string;
  minimumDue: string;
  statementDate: string;
  dueDate: string;
  principal: string;
  interestRate: string;
  installmentsTotal: string;
  installmentsRemaining: string;
  autopay: "enabled" | "disabled" | "unknown";
  notes: string;
};

const emptyDraft = (): Draft => ({
  kind: "transaction", name: "", amount: "", currency: "INR",
  date: "", category: "Other",
  transactionType: "expense", status: "completed", frequency: "monthly",
  nextDate: "", provider: "", issuer: "", lastFour: "", creditLimit: "",
  outstanding: "", statementBalance: "", minimumDue: "", statementDate: "",
  dueDate: "", principal: "", interestRate: "", installmentsTotal: "",
  installmentsRemaining: "", autopay: "unknown", notes: "",
});

const tabs: { id: "overview" | RecordKind; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transaction", label: "Transactions" },
  { id: "subscription", label: "Subscriptions" },
  { id: "card", label: "Credit cards" },
  { id: "emi", label: "EMIs & loans" },
  { id: "bill", label: "Bills & autopay" },
];

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

function amountValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function dateLabel(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function badgeClass(status: string) {
  if (["completed", "paid", "active", "income"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["failed", "overdue", "cancelled"].includes(status)) return "bg-rose-50 text-rose-700";
  if (["pending", "upcoming", "due", "trial"].includes(status)) return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function FinanceClient() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"overview" | RecordKind>("overview");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [csvPreview, setCsvPreview] = useState<FinancialRecord[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const [csvInputKey, setCsvInputKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecords(parsed as FinancialRecord[]);
      }
    } catch {
      setNotice("Saved browser data could not be read. Export any important data before clearing browser storage.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
    catch { setNotice("Could not save changes in this browser. Export your data and check available storage."); }
  }, [records, hydrated]);

  const transactions = useMemo(() => records.filter((r) => r.kind === "transaction"), [records]);
  const subscriptions = useMemo(() => records.filter((r) => r.kind === "subscription" && !["cancelled"].includes(r.status)), [records]);
  const cards = useMemo(() => records.filter((r) => r.kind === "card"), [records]);
  const emis = useMemo(() => records.filter((r) => r.kind === "emi" && r.status !== "cancelled"), [records]);
  const bills = useMemo(() => records.filter((r) => r.kind === "bill" && r.status !== "cancelled"), [records]);

  const income = transactions.filter((r) => r.transactionType === "income").reduce((s, r) => s + r.amount, 0);
  const expenses = transactions.filter((r) => r.transactionType === "expense").reduce((s, r) => s + r.amount, 0);
  const refunds = transactions.filter((r) => r.transactionType === "refund").reduce((s, r) => s + r.amount, 0);
  const subscriptionMonthly = subscriptions.filter((r) => ["active", "trial"].includes(r.status)).reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);
  const monthlyEmi = emis.filter((r) => r.status === "active").reduce((s, r) => s + r.amount, 0);
  const cardOutstanding = cards.reduce((s, r) => s + (r.outstanding ?? r.statementBalance ?? 0), 0);
  const upcoming = [...bills, ...emis, ...subscriptions, ...cards]
    .filter((r) => r.dueDate || r.nextDate)
    .map((r) => ({ ...r, actionDate: r.dueDate || r.nextDate || "" }))
    .filter((r) => isFutureDate(r.actionDate))
    .sort((a, b) => a.actionDate.localeCompare(b.actionDate))
    .slice(0, 8);

  const visible = records
    .filter((r) => tab === "overview" || r.kind === tab)
    .filter((r) => {
      const q = search.trim().toLowerCase();
      return !q || [r.name, r.description, r.category, r.provider, r.issuer, r.notes].some((v) => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));

  function openNew(kind: RecordKind = tab === "overview" ? "transaction" : tab) {
    setEditingId(null);
    setDraft({ ...emptyDraft(), date: new Date().toISOString().slice(0, 10), kind, category: kind === "subscription" ? "Subscriptions" : kind === "emi" ? "EMI & loans" : kind === "card" ? "Credit card payment" : "Other", transactionType: kind === "transaction" ? "expense" : "expense", status: kind === "subscription" || kind === "emi" ? "active" : kind === "card" ? "active" : kind === "bill" ? "upcoming" : "completed" });
    setShowForm(true);
  }

  function openEdit(record: FinancialRecord) {
    setEditingId(record.id);
    setDraft({
      ...emptyDraft(), ...record, amount: String(record.amount),
      creditLimit: record.creditLimit === undefined ? "" : String(record.creditLimit),
      outstanding: record.outstanding === undefined ? "" : String(record.outstanding),
      statementBalance: record.statementBalance === undefined ? "" : String(record.statementBalance),
      minimumDue: record.minimumDue === undefined ? "" : String(record.minimumDue),
      principal: record.principal === undefined ? "" : String(record.principal),
      interestRate: record.interestRate === undefined ? "" : String(record.interestRate),
      installmentsTotal: record.installmentsTotal === undefined ? "" : String(record.installmentsTotal),
      installmentsRemaining: record.installmentsRemaining === undefined ? "" : String(record.installmentsRemaining),
      date: record.date || "",
    } as Draft);
    setShowForm(true);
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = amountValue(draft.amount);
    if (!draft.name.trim()) { setNotice("Enter a name or description."); return; }
    if (amount === undefined) { setNotice("Enter a valid non-negative amount."); return; }
    if (draft.kind === "card" && draft.lastFour && !/^\d{4}$/.test(draft.lastFour)) { setNotice("For safety, enter only the last four card digits."); return; }
    const now = new Date().toISOString();
    const optionalNumber = (v: string) => v.trim() ? Number(v) : undefined;
    const record: FinancialRecord = {
      id: editingId || crypto.randomUUID(),
      kind: draft.kind,
      name: draft.name.trim(),
      amount,
      currency: draft.currency || "INR",
      date: draft.kind === "transaction" ? (draft.date || undefined) : undefined,
      category: draft.category || "Other",
      transactionType: draft.kind === "transaction" ? draft.transactionType : undefined,
      description: draft.kind === "transaction" ? draft.name.trim() : undefined,
      status: draft.status,
      source: editingId ? records.find((r) => r.id === editingId)?.source || "manual" : "manual",
      frequency: ["subscription", "bill"].includes(draft.kind) ? draft.frequency : undefined,
      nextDate: ["subscription", "bill"].includes(draft.kind) ? (draft.nextDate || undefined) : undefined,
      provider: draft.provider.trim() || undefined,
      issuer: draft.issuer.trim() || undefined,
      lastFour: draft.lastFour || undefined,
      creditLimit: optionalNumber(draft.creditLimit),
      outstanding: optionalNumber(draft.outstanding),
      statementBalance: optionalNumber(draft.statementBalance),
      minimumDue: optionalNumber(draft.minimumDue),
      statementDate: draft.statementDate || undefined,
      dueDate: ["card", "emi", "bill"].includes(draft.kind) ? (draft.dueDate || undefined) : undefined,
      principal: optionalNumber(draft.principal),
      interestRate: optionalNumber(draft.interestRate),
      installmentsTotal: optionalNumber(draft.installmentsTotal),
      installmentsRemaining: optionalNumber(draft.installmentsRemaining),
      autopay: draft.kind === "bill" ? draft.autopay : undefined,
      notes: draft.notes.trim() || undefined,
      createdAt: editingId ? records.find((r) => r.id === editingId)?.createdAt || now : now,
      updatedAt: now,
    };
    setRecords((prev) => editingId ? prev.map((r) => r.id === editingId ? record : r) : [record, ...prev]);
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setNotice(editingId ? "Record updated." : "Record saved in this browser.");
  }

  function deleteRecord(record: FinancialRecord) {
    if (!window.confirm(`Delete "${record.name}"? This only removes the record from this browser.`)) return;
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setNotice("Record deleted.");
  }

  async function handleCsv(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setNotice("CSV must be 2 MB or smaller."); return; }
    try {
      const parsed = parseTransactionCsv(await file.text());
      const now = new Date().toISOString();
      const mapped: FinancialRecord[] = parsed.records.map((r) => ({ ...r, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
      const existingKeys = new Set(records.filter((r) => r.kind === "transaction").map((r) => [r.name.toLowerCase(), r.amount, r.date, r.transactionType].join("|")));
      const seen = new Set<string>();
      const unique = mapped.filter((r) => {
        const key = [r.name.toLowerCase(), r.amount, r.date, r.transactionType].join("|");
        if (existingKeys.has(key) || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setCsvSkipped(mapped.length - unique.length);
      setCsvPreview(unique);
      setCsvErrors(parsed.errors);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read this CSV.");
      setCsvPreview(null);
    }
  }

  function commitCsv() {
    if (!csvPreview) return;
    setRecords((prev) => [...csvPreview, ...prev]);
    setNotice(`Imported ${csvPreview.length} transactions; skipped ${csvSkipped} likely duplicates. ${csvErrors.length} invalid rows were rejected.`);
    setCsvPreview(null); setCsvErrors([]); setCsvSkipped(0); setCsvInputKey((k) => k + 1);
  }

  function exportCsv() {
    const headers = ["kind","name","amount","currency","date","category","transactionType","status","frequency","nextDate","provider","issuer","lastFour","creditLimit","outstanding","statementBalance","minimumDue","statementDate","dueDate","principal","interestRate","installmentsTotal","installmentsRemaining","autopay","source","notes"];
    const escape = (v: unknown) => {
      const str = v == null ? "" : String(v);
      return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };
    const body = [headers.join(","), ...records.map((r) => headers.map((h) => escape((r as unknown as Record<string, unknown>)[h])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "veltrio-financial-records.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white" aria-label="Back to Veltrio home"><ArrowLeft size={18}/></Link>
            <div><p className="text-lg font-bold tracking-tight">Veltrio <span className="font-medium text-slate-400">/ Finance</span></p><p className="text-xs text-slate-500">Your personal financial control center</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex"><Download size={15}/> Export</button>
            <button onClick={() => openNew()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={16}/> Add record</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Personal finance</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Know what your money needs next.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Track spending, subscriptions, credit cards, EMIs and recurring bills in one place.</p></div>
          <button onClick={() => fileRef.current?.click()} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:border-blue-300"><FileUp size={16}/> Import transaction CSV</button>
          <input key={csvInputKey} ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleCsv(e.target.files?.[0])}/>
        </div>

        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900"><strong>Local prototype:</strong> Records are saved in this browser only. No bank account is connected and no payment is initiated. Export a backup before clearing browser data.</div>
        {notice && <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16}/></button></div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Recorded income" value={formatINR(income)} detail="From transaction records" icon={<ArrowDownLeft size={18}/>} tone="green"/>
          <SummaryCard label="Recorded expenses" value={formatINR(expenses - refunds)} detail="Refunds shown separately in totals" icon={<ArrowUpRight size={18}/>} tone="blue"/>
          <SummaryCard label="Monthly subscriptions" value={formatINR(subscriptionMonthly)} detail="Estimated from active plans" icon={<Repeat2 size={18}/>} tone="purple"/>
          <SummaryCard label="Card balances" value={formatINR(cardOutstanding)} detail="Outstanding / statement balances entered" icon={<CreditCard size={18}/>} tone="amber"/>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Monthly snapshot</h2><p className="mt-1 text-xs text-slate-500">Based on records you've entered</p></div><Wallet className="text-blue-600" size={20}/></div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Recorded transactions" value={String(transactions.length)} hint="All imported and manual"/>
              <Metric label="Monthly EMI commitments" value={formatINR(monthlyEmi)} hint="Active EMIs entered"/>
              <Metric label="Subscriptions / year" value={formatINR(subscriptions.filter((r) => ["active", "trial"].includes(r.status)).reduce((s, r) => s + annualEquivalent(r.amount, r.frequency), 0))} hint="Estimated recurring cost"/>
              <Metric label="Upcoming commitments" value={String(upcoming.length)} hint="Known future dates only"/>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">This is not a bank balance or a guaranteed cash-flow forecast. Add all relevant commitments for a more complete picture.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Coming up</h2><p className="mt-1 text-xs text-slate-500">Future dates you've recorded</p></div><CalendarClock size={20} className="text-blue-600"/></div>
            {upcoming.length === 0 ? <EmptySmall text="No upcoming dates recorded yet. Add a bill, subscription or EMI to start your calendar."/> : <div className="space-y-3">{upcoming.map((r) => <div key={r.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{r.name}</p><p className="text-xs text-slate-500">{dateLabel(r.dueDate || r.nextDate)} · {KIND_LABELS[r.kind]}</p></div><p className="shrink-0 text-sm font-semibold">{formatINR(r.amount, r.currency)}</p></div>)}</div>}
          </section>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 pt-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto pb-3">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>{item.label}{item.id !== "overview" && <span className="ml-2 text-xs opacity-70">{records.filter((r) => r.kind === item.id).length}</span>}</button>)}</div>
          </div>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="font-bold">{tab === "overview" ? "All financial records" : tabs.find((t) => t.id === tab)?.label}</h2><p className="mt-1 text-xs text-slate-500">{visible.length} record{visible.length === 1 ? "" : "s"}</p></div>
            <div className="flex flex-wrap gap-2"><label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search financial records" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." className={inputClass + " pl-9"}/></label><button onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"><Plus size={15}/> Add</button></div>
          </div>
          {visible.length === 0 ? <div className="p-10"><EmptyState onAdd={() => openNew()} onImport={() => fileRef.current?.click()}/></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-semibold">Record</th><th className="px-4 py-3 font-semibold">Category / type</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Next date</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-6 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((r) => <tr key={r.id} className="hover:bg-slate-50/70"><td className="px-6 py-4"><p className="font-semibold text-slate-900">{r.name}</p><p className="mt-1 text-xs text-slate-500">{r.provider || r.issuer || r.description || KIND_LABELS[r.kind]}</p></td><td className="px-4 py-4"><p>{r.category || KIND_LABELS[r.kind]}</p><p className="mt-1 text-xs text-slate-400">{r.transactionType || r.frequency || KIND_LABELS[r.kind]}</p></td><td className="px-4 py-4 font-semibold">{formatINR(r.amount, r.currency)}{r.kind === "subscription" && r.frequency && <p className="mt-1 text-xs font-normal text-slate-400">{formatINR(monthlyEquivalent(r.amount, r.frequency))}/mo est.</p>}</td><td className="px-4 py-4 text-slate-600">{dateLabel(r.dueDate || r.nextDate || r.date)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(r.status)}`}>{r.status}</span></td><td className="px-4 py-4 text-xs capitalize text-slate-500">{r.source}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(r)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-blue-300 hover:text-blue-700">Edit</button><button aria-label={`Delete ${r.name}`} onClick={() => deleteRecord(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
        </section>
        <footer className="py-7 text-center text-xs text-slate-400">Veltrio Finance · Browser-local prototype · No bank or payment connections</footer>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="record-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
          <div className="mb-5 flex items-start justify-between"><div><h2 id="record-form-title" className="text-xl font-bold">{editingId ? "Edit record" : "Add financial record"}</h2><p className="mt-1 text-sm text-slate-500">Enter only information you know. Unknown values can be left blank.</p></div><button aria-label="Close form" onClick={() => setShowForm(false)} className="rounded-xl p-2 hover:bg-slate-100"><X size={18}/></button></div>
          <form onSubmit={saveRecord} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Record type"><select className={inputClass} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as RecordKind, category: e.target.value === "subscription" ? "Subscriptions" : e.target.value === "emi" ? "EMI & loans" : e.target.value === "card" ? "Credit card payment" : "Other" })}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Name / description"><input required className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Netflix, HDFC card, laptop EMI"/></Field><Field label="Amount (positive value)"><input required type="number" min="0" step="0.01" className={inputClass} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0.00"/></Field><Field label="Currency"><select className={inputClass} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}><option value="INR">INR — Indian rupee</option><option value="USD">USD — US dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British pound</option></select></Field>
            {draft.kind === "transaction" && <><Field label="Transaction date"><input type="date" className={inputClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}/></Field><Field label="Transaction type"><select className={inputClass} value={draft.transactionType} onChange={(e) => setDraft({ ...draft, transactionType: e.target.value as Draft["transactionType"] })}><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="transfer">Transfer</option></select></Field></>}
            <Field label="Category"><select className={inputClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as RecordStatus })}>{(["pending","completed","failed","cancelled","active","paused","trial","upcoming","due","paid","overdue"] as RecordStatus[]).map((s) => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></Field>
            {["subscription","bill"].includes(draft.kind) && <><Field label="Billing frequency"><select className={inputClass} value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Draft["frequency"] })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option></select></Field><Field label="Next renewal / expected date"><input type="date" className={inputClass} value={draft.nextDate} onChange={(e) => setDraft({ ...draft, nextDate: e.target.value })}/></Field></>}
            {draft.kind === "subscription" && <Field label="Provider"><input className={inputClass} value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder="e.g. Netflix"/></Field>}
            {draft.kind === "card" && <><Field label="Card issuer"><input className={inputClass} value={draft.issuer} onChange={(e) => setDraft({ ...draft, issuer: e.target.value })} placeholder="e.g. HDFC Bank"/></Field><Field label="Nickname"><input className={inputClass} value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder="e.g. Everyday card"/></Field><Field label="Last 4 digits only"><input inputMode="numeric" maxLength={4} className={inputClass} value={draft.lastFour} onChange={(e) => setDraft({ ...draft, lastFour: e.target.value.replace(/\D/g, "").slice(0,4) })} placeholder="1234"/></Field><Field label="Credit limit (optional)"><NumberInput value={draft.creditLimit} onChange={(v) => setDraft({ ...draft, creditLimit: v })}/></Field><Field label="Current outstanding (optional)"><NumberInput value={draft.outstanding} onChange={(v) => setDraft({ ...draft, outstanding: v })}/></Field><Field label="Statement balance (optional)"><NumberInput value={draft.statementBalance} onChange={(v) => setDraft({ ...draft, statementBalance: v })}/></Field><Field label="Minimum amount due (optional)"><NumberInput value={draft.minimumDue} onChange={(v) => setDraft({ ...draft, minimumDue: v })}/></Field><Field label="Statement date"><input type="date" className={inputClass} value={draft.statementDate} onChange={(e) => setDraft({ ...draft, statementDate: e.target.value })}/></Field><Field label="Payment due date"><input type="date" className={inputClass} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}/></Field></>}
            {draft.kind === "emi" && <><Field label="Lender"><input className={inputClass} value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder="Bank / lender"/></Field><Field label="Outstanding principal (optional)"><NumberInput value={draft.principal} onChange={(v) => setDraft({ ...draft, principal: v })}/></Field><Field label="Interest rate % (optional)"><NumberInput value={draft.interestRate} onChange={(v) => setDraft({ ...draft, interestRate: v })}/></Field><Field label="Total installments"><NumberInput value={draft.installmentsTotal} onChange={(v) => setDraft({ ...draft, installmentsTotal: v })}/></Field><Field label="Installments remaining"><NumberInput value={draft.installmentsRemaining} onChange={(v) => setDraft({ ...draft, installmentsRemaining: v })}/></Field><Field label="Next EMI due date"><input type="date" className={inputClass} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}/></Field></>}
            {draft.kind === "bill" && <><Field label="Provider / payee"><input className={inputClass} value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder="e.g. Electricity provider"/></Field><Field label="Autopay status"><select className={inputClass} value={draft.autopay} onChange={(e) => setDraft({ ...draft, autopay: e.target.value as Draft["autopay"] })}><option value="unknown">Unknown</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></Field><Field label="Due date"><input type="date" className={inputClass} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}/></Field></>}
            <div className="sm:col-span-2"><Field label="Notes (optional)"><textarea rows={2} className={inputClass} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Additional details"/></Field></div></div>
            {draft.kind === "card" && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Never enter your full card number, CVV, PIN, or banking password. Balances entered here are user-provided, not bank-verified.</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{editingId ? "Save changes" : "Save record"}</button></div>
          </form>
        </div>
      </div>}

      {csvPreview && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="csv-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between"><div><h2 id="csv-title" className="text-xl font-bold">Review CSV import</h2><p className="mt-1 text-sm text-slate-500">No records are saved until you confirm.</p></div><button aria-label="Close import preview" onClick={() => setCsvPreview(null)}><X size={18}/></button></div><div className="my-4 grid grid-cols-3 gap-3"><Metric label="Ready to import" value={String(csvPreview.length)} hint="Valid rows"/><Metric label="Duplicates skipped" value={String(csvSkipped)} hint="Likely matches"/><Metric label="Invalid rows" value={String(csvErrors.length)} hint="Rejected"/></div>{csvErrors.length > 0 && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><p className="mb-1 font-semibold">Rows needing correction</p><ul className="list-inside list-disc">{csvErrors.slice(0,10).map((e) => <li key={e}>{e}</li>)}</ul>{csvErrors.length > 10 && <p className="mt-1">And {csvErrors.length-10} more.</p>}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Type</th><th className="p-3">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{csvPreview.slice(0,25).map((r) => <tr key={r.id}><td className="p-3">{dateLabel(r.date)}</td><td className="p-3">{r.name}</td><td className="p-3 capitalize">{r.transactionType}</td><td className="p-3 font-semibold">{formatINR(r.amount,r.currency)}</td></tr>)}</tbody></table></div>{csvPreview.length > 25 && <p className="mt-2 text-xs text-slate-500">Showing first 25 of {csvPreview.length} valid records.</p>}<div className="mt-5 flex justify-end gap-3"><button onClick={() => setCsvPreview(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={!csvPreview.length} onClick={commitCsv} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Import {csvPreview.length} records</button></div></div></div>}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}
function NumberInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="number" min="0" step="0.01" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional"/>;
}
function SummaryCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: "green"|"blue"|"purple"|"amber" }) {
  const toneClass = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", purple: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-800" }[tone];
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span></div><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}
function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold">{value}</p><p className="mt-1 text-[11px] leading-4 text-slate-400">{hint}</p></div>;
}
function EmptySmall({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm leading-6 text-slate-500">{text}</div>;
}
function EmptyState({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return <div className="mx-auto max-w-md text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ReceiptText size={22}/></div><h3 className="mt-4 font-bold">Your records will show up here</h3><p className="mt-2 text-sm leading-6 text-slate-500">Start with a manual entry or import transaction history from a CSV file. Connected bank data comes in a later phase.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15}/> Add a record</button><button onClick={onImport} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><FileUp size={15}/> Import CSV</button></div></div>;
}
