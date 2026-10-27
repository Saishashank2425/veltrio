"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, ExternalLink, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles } from "lucide-react";

const retailers = [
  { id: "google", name: "Google Shopping", detail: "Compare listings across stores", url: (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`, badge: "Broad comparison" },
  { id: "amazon", name: "Amazon India", detail: "Marketplace listings and reviews", url: (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`, badge: "Marketplace" },
  { id: "flipkart", name: "Flipkart", detail: "Electronics, home, fashion and more", url: (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`, badge: "Marketplace" },
  { id: "croma", name: "Croma", detail: "Electronics and appliances", url: (q: string) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}%3Arelevance`, badge: "Electronics" },
  { id: "reliance", name: "Reliance Digital", detail: "Electronics and gadgets", url: (q: string) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}`, badge: "Electronics" },
  { id: "myntra", name: "Myntra", detail: "Clothing, footwear and accessories", url: (q: string) => `https://www.myntra.com/${encodeURIComponent(q).replace(/%20/g, "-")}`, badge: "Fashion" },
];

const suggestions = ["wireless headphones", "laptop under ₹60,000", "running shoes", "office chair", "smartwatch"];

export default function ShopPage() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("All");
  const [searched, setSearched] = useState(false);

  const activeQuery = useMemo(() => {
    const parts = [query.trim(), budget.trim() ? `under ₹${budget.trim()}` : ""].filter(Boolean);
    return parts.join(" ");
  }, [query, budget]);

  const visibleRetailers = retailers.filter((retailer) => {
    if (category === "All") return true;
    if (category === "Electronics") return ["google", "amazon", "flipkart", "croma", "reliance"].includes(retailer.id);
    if (category === "Fashion") return ["google", "amazon", "flipkart", "myntra"].includes(retailer.id);
    return ["google", "amazon", "flipkart"].includes(retailer.id);
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="border-b border-[#e8ebf0] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/agents" className="flex items-center gap-2 text-sm font-semibold text-[#234fa4]"><ArrowLeft size={16}/> Back to Agent Hub</a>
          <a href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#234fa4]"><span className="grid h-6 w-6 grid-cols-2 gap-[3px]"><i className="rounded-[3px] bg-[#315bff]"/><i className="rounded-[3px] bg-[#315bff]/50"/><i className="rounded-[3px] bg-[#315bff]/50"/><i className="rounded-[3px] bg-[#315bff]/20"/></span>Veltrio</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-[#eef2ff] px-3 py-1.5 text-xs font-medium text-[#315bff]"><Sparkles size={13}/> Shopping assistant</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Find it. Compare it. <span className="text-[#315bff]">Stay in control.</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#667085] sm:text-base">Search across popular retailers from one place. Veltrio helps you research options while keeping purchase decisions and payment authorization under your control.</p>
        </div>

        <form onSubmit={submitSearch} className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#dfe4eb] bg-white p-3 shadow-[0_8px_30px_rgba(16,24,40,.06)]">
          <label className="flex items-center gap-3 px-2"><Search className="shrink-0 text-[#98a2b3]" size={20}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="What are you looking for? e.g. Sony headphones" aria-label="Product search query" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#98a2b3] sm:text-base"/></label>
          <div className="mt-2 flex flex-col gap-2 border-t border-[#f0f2f5] pt-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-2"><SlidersHorizontal size={15} className="text-[#98a2b3]"/><span className="text-xs text-[#667085]">Max budget ₹</span><input type="number" min="1" max="10000000" value={budget} onChange={(e)=>setBudget(e.target.value)} placeholder="Optional" aria-label="Maximum budget in rupees" className="w-28 rounded-lg border border-[#e4e7ec] px-2 py-1.5 text-xs outline-none focus:border-[#315bff]"/></div>
            <button type="submit" disabled={!query.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#315bff] px-5 text-sm font-semibold text-white transition hover:bg-[#2446d8] disabled:cursor-not-allowed disabled:opacity-40"><Search size={15}/> Search products</button>
          </div>
        </form>

        {!searched && <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2"><span className="mr-1 text-xs text-[#98a2b3]">Try:</span>{suggestions.map((suggestion)=><button key={suggestion} onClick={()=>{setQuery(suggestion);setSearched(true);}} className="rounded-full border border-[#e4e7ec] bg-white px-3 py-1.5 text-xs text-[#667085] transition hover:border-[#c6d2ff] hover:text-[#315bff]"}>{suggestion}</button>)}</div>}

        {searched && <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#315bff]">Search destinations</p><h2 className="mt-1 text-xl font-semibold">Results for “{activeQuery}”</h2><p className="mt-1 text-sm text-[#667085]">Choose a store to open its search results.</p></div><div className="flex flex-wrap gap-2">{["All","Electronics","Fashion","Other"].map((item)=><button key={item} onClick={()=>setCategory(item)} className={"rounded-full px-3 py-1.5 text-xs font-medium "+(category===item?"bg-[#172033] text-white":"border border-[#e4e7ec] bg-white text-[#667085] hover:border-[#cbd5e1]")}>{item}</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleRetailers.map((retailer)=><article key={retailer.id} className="flex min-h-44 flex-col rounded-2xl border border-[#e5e9f0] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c6d2ff] hover:shadow-md"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#315bff]"><ShoppingBag size={18}/></span><span className="rounded-full bg-[#f2f4f7] px-2 py-1 text-[10px] font-medium text-[#667085]">{retailer.badge}</span></div><h3 className="mt-4 text-base font-semibold">{retailer.name}</h3><p className="mt-1 flex-1 text-xs leading-5 text-[#667085]">{retailer.detail}</p><a href={retailer.url(activeQuery)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#dfe4eb] px-3 text-xs font-semibold text-[#344054] transition hover:border-[#315bff] hover:text-[#315bff]">Search {retailer.name}<ArrowUpRight size={14}/></a></article>)}</div>
        </section>}

        {!searched && <section className="mx-auto mt-12 max-w-4xl"><div className="mb-4 flex items-center gap-2"><ShoppingBag size={17} className="text-[#315bff]"/><h2 className="text-sm font-semibold">Popular places to search</h2></div><div className="grid gap-3 sm:grid-cols-3">{retailers.slice(0,3).map((retailer)=><article key={retailer.id} className="rounded-2xl border border-[#e5e9f0] bg-white p-4"><h3 className="text-sm font-semibold">{retailer.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{retailer.detail}</p><button onClick={()=>{setQuery("wireless headphones");setSearched(true);}} className="mt-3 text-xs font-semibold text-[#315bff]">Try a sample search <ArrowUpRight className="ml-1 inline" size={13}/></button></article>)}</div></section>}

        <div className="mx-auto mt-10 flex max-w-3xl gap-3 rounded-2xl border border-[#dbe4ff] bg-[#eef2ff]/70 p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#315bff]"/><div><p className="text-xs font-semibold text-[#253f91]">Transparent search, safe decisions</p><p className="mt-1 text-xs leading-5 text-[#52617e]">Retailer searches open in a new tab. This version does not scrape or verify live inventory, final prices, discounts, or seller quality inside Veltrio. Confirm details on the retailer’s page. No order is placed and no payment is authorized by searching.</p></div></div>
        <footer className="mt-10 flex items-center justify-center gap-2 text-[11px] text-[#98a2b3]"><ExternalLink size={12}/> External retailer sites have their own terms, listings, and availability.</footer>
      </div>
    </main>
  );
}
