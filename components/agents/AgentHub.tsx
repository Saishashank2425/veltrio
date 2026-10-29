"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, Bot, Check, ChevronDown, CircleHelp,
  Clock3, Command, Compass, CreditCard, ExternalLink, Globe, Headphones,
  History, LayoutGrid, MapPin, MessageSquare, MoreHorizontal, Package,
  Plus, Search, Send, Settings2, ShieldCheck, ShoppingBag, Sparkles,
  Store, ToggleLeft, ToggleRight, Wrench, X, Zap,
} from "lucide-react";
import { PageGuide } from "@/components/ui/PageGuide";

type Agent = { id: string; name: string; kind: string; icon: string; description: string; tools: string[]; status: string };
type ProductCard = { id: string; title: string; price: string | null; image: string | null; url: string; retailer: string | null; rating: number | null; reviews: number | null; delivery: string | null };
type Message = { id: string; role: "user" | "assistant"; text: string; products?: ProductCard[]; listingCount?: number; time: string };
type Conversation = { id: string; title: string; agentId: string; messages: Message[]; updated: number };

const defaultTools = [
  { id: "web", name: "Web research", description: "Search and read public webpages", icon: Globe, connected: true },
  { id: "shopping", name: "Product search", description: "Retailer search; live comparison results require the configured provider", icon: ShoppingBag, connected: true },
  { id: "price", name: "Price tracking", description: "Target-price planning; automatic monitoring is not configured", icon: Activity, connected: false },
  { id: "location", name: "Location", description: "Use a chosen address or ask permission for device location", icon: MapPin, connected: false },
  { id: "finance", name: "Finance records", description: "Read finance data saved in this browser", icon: CreditCard, connected: true },
  { id: "notify", name: "Notifications", description: "Prepare alerts for supported channels", icon: Zap, connected: false },
  { id: "payments", name: "Payments", description: "Requires a supported provider and explicit approval", icon: ShieldCheck, connected: false },
];

const starterAgents: Agent[] = [
  { id: "shopping", name: "Product Research", kind: "Commerce", icon: "PR", description: "Compare product options against your budget and requirements.", tools: ["shopping"], status: "Ready" },
  { id: "purchase", name: "Purchase Planner", kind: "Commerce", icon: "PP", description: "Turn a shortlist into a review checklist and spending-rule draft.", tools: ["shopping"], status: "Ready" },
  { id: "subscriptions", name: "Spend Review", kind: "Finance", icon: "SR", description: "Organise subscription, bill, and recurring-cost records saved in this browser.", tools: ["finance"], status: "Ready" },
  { id: "finance", name: "Finance Organizer", kind: "Finance", icon: "FO", description: "Review local income, expenses, bills, cards, and EMIs.", tools: ["finance"], status: "Ready" },
];

const starterConversations: Conversation[] = [
  { id: "welcome", title: "Start a task", agentId: "shopping", updated: Date.now(), messages: [] },
];

function id() { return Math.random().toString(36).slice(2, 10); }
function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export default function AgentHub() {
  const [agents, setAgents] = useState(starterAgents);
  const [tools, setTools] = useState(defaultTools);
  const [conversations, setConversations] = useState(starterConversations);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"chat" | "tools">("chat");
  const [rightOpen, setRightOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [newAgentTools, setNewAgentTools] = useState<string[]>(["web"]);
  const [agentFilter, setAgentFilter] = useState("All");
  const [status, setStatus] = useState("Ready");
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("veltrio-agent-hub-v1");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.conversations) && saved.conversations.length) setConversations(saved.conversations);
        if (Array.isArray(saved.agents) && saved.agents.length) {
          const iconById: Record<string, string> = { shopping: "PR", purchase: "PP", subscriptions: "SR", finance: "FO" };
          const focusedAgents = saved.agents.filter((item: Agent) => ["shopping", "purchase", "subscriptions", "finance"].includes(item.id) || item.kind === "Custom");
          setAgents(focusedAgents.map((item: Agent) => ({ ...item, icon: iconById[item.id] ?? (/^[A-Z]{1,3}$/.test(item.icon) ? item.icon : "CA") })));
        }
      }
    } catch { /* keep starter data if local storage is unavailable */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("veltrio-agent-hub-v1", JSON.stringify({ conversations, agents })); } catch { /* optional browser persistence */ }
  }, [conversations, agents]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [activeId, conversations]);
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const agent = agents.find((a) => a.id === active?.agentId) ?? agents[0];
  const visibleConversations = useMemo(() => conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const filteredAgents = agents.filter((a) => agentFilter === "All" || a.kind === agentFilter);

  function patchConversation(idToPatch: string, patcher: (c: Conversation) => Conversation) {
    setConversations((old) => old.map((c) => c.id === idToPatch ? patcher(c) : c));
  }
  function newChat(agentId = agent?.id ?? "shopping") {
    const next: Conversation = { id: id(), title: "New conversation", agentId, updated: Date.now(), messages: [] };
    setConversations((old) => [next, ...old]); setActiveId(next.id); setActiveView("chat"); setInput(""); setStatus("Ready");
  }
  function chooseAgent(nextAgent: Agent) {
    const found = conversations.find((c) => c.agentId === nextAgent.id);
    if (found) setActiveId(found.id); else newChat(nextAgent.id);
    setActiveView("chat");
  }
  function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean || !active) return;

    const userMessage: Message = { id: id(), role: "user", text: clean, time: now() };
    const priorMessages = active.messages;
    const nextMessages = [...priorMessages, userMessage];
    const title = active.messages.length === 0
      ? clean.slice(0, 38)
      : active.title === "New conversation" ? clean.slice(0, 38) : active.title;

    patchConversation(active.id, (c) => ({
      ...c,
      title,
      messages: nextMessages,
      updated: Date.now(),
    }));
    setInput("");
    setStatus("Thinking");

    // Commerce intent is inferred from the question, then the response adapts to that intent.
    // Live product facts are only shown when the configured product-search API returns them.
    window.setTimeout(async () => {
      const low = clean.toLowerCase();
      const historyText = priorMessages.map((m) => m.text).join(" ").toLowerCase();
      const isFollowUp = /\b(it|that|those|them|which one|the first|the second|compare|best one|more details)\b/.test(low);
      let reply = "";
      let productCards: ProductCard[] | undefined;
      let listingCount: number | undefined;

      const budgetMatch = clean.match(/(?:under|below|less than|within|budget(?: of)?|₹|rs\.?\s*)(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(k|thousand)?/i);
      const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) * (/^(k|thousand)$/i.test(budgetMatch[2] || "") ? 1000 : 1) : undefined;
      const shoppingIntent = /\b(find|search|show|recommend|suggest|buy|shop|looking for|best|compare|under|below|wireless|smartwatches?|watches?|phones?|laptops?|headphones?|earphones?|earbuds?|shoes?|tablets?|monitors?|cameras?|keyboards?|mice|mouse|products?|price of)\b/.test(low);
      const trackingIntent = /\b(track|price alert|price drop|notify me|target price|price tracking|alert me)\b/.test(low);
      const mandateIntent = /\b(mandate|spending rules|purchase rules|spending limit|purchase limit|allow my .*agent|spend up to|per purchase|monthly budget|ask me to approve|only allow|ask me before|require approval|approval threshold)\b/.test(low);
      const approvalIntent = /\b(buy it|purchase it|place order|checkout|pay for|order it|buy the|purchase the)\b/.test(low);
      const financeIntent = /\b(subscription|emi|bill|spending|finance|expense|budget summary)\b/.test(low);
      const foodIntent = /\b(pizza|food delivery|restaurant|order food|domino|burger)\b/.test(low);
      const productSearchTerm = clean
        .replace(/\b(find|search for|show me|recommend|suggest|please|can you|could you|help me find|best)\b/gi, " ")
        .replace(/\b(under|below|less than|within my budget|with good|with|and|please|budget(?: of)?)\b/gi, " ")
        .replace(/₹\s*[\d,]+|rs\.?\s*[\d,]+|\b[\d,]+\s*(?:rupees|rs|k|thousand)\b/gi, " ")
        .replace(budgetMatch ? /\b[\d,]+(?:\.\d+)?\s*(?:k|thousand)?\b/gi : /$^/, " ")
        .replace(/\s+/g, " ").trim();

      try {
        if (mandateIntent) {
          reply = "I can turn those instructions into a structured spending-mandate draft. Open Mandates from the top navigation, describe your rules, review the extracted limits and merchant restrictions, then save them. Saved mandates are currently stored in this browser and are not yet enforced by the authorization gateway.";
        } else if (approvalIntent) {
          reply = "I can prepare the purchase for authorization, but I haven't placed an order. Select the exact product and retailer first. Veltrio's deterministic gateway must then check the transaction against your mandate; if approval is required, you'll need to approve it explicitly. Real payment execution is not connected in this demo.";
        } else if (trackingIntent) {
          const hasTarget = /₹\s*[\d,]+|\b[\d,]+\s*(?:rupees|rs)\b/i.test(clean);
          reply = hasTarget
            ? "I've captured the product and target-price criteria from your message. This is a tracking plan only: automated price checks and notifications are not active until a monitoring source and notification channel are configured. You can use Product search to check current listings, then revisit the target price."
            : "I can help define a target price and tracking criteria. What product should I watch, and what price would make it worth buying? Price monitoring and notifications are not active until a product source and notification channel are connected.";
        } else if (foodIntent) {
          reply = "I can help compare menu options and prepare an order. A live menu and ordering integration isn't connected, so I can't verify availability or place the order. Tell me the dish, serving size, budget, and preferred restaurant, and I'll help narrow down the choices.";
        } else if (financeIntent) {
          reply = "I can help organise your spending, bills, EMIs, and subscriptions using records saved in Veltrio Finance on this browser. Those records are local to this browser; bank access, account syncing, and payment execution aren't connected. What would you like to review first?";
        } else if (
          shoppingIntent ||
          (isFollowUp && /shopping|product|watch|headphone|laptop|phone/.test(historyText)) ||
          // Product Research and Purchase Planner should treat a natural-language task
          // as a shopping request even when the wording doesn't match a keyword.
          (agent.tools.includes("shopping") && !/\\b(hello|hi\\b|hey|good morning|good evening)\\b/.test(low))
        ) {
          const query = productSearchTerm || clean;
          setStatus("Searching products");
          const params = new URLSearchParams({ q: query });
          if (budget && Number.isFinite(budget)) params.set("budget", String(budget));
          const response = await fetch("/api/products?" + params.toString(), { cache: "no-store" });
          const data = await response.json();
          const results = Array.isArray(data.results) ? data.results : [];
          if (response.ok && data.configured && results.length) {
            const intro = budget
              ? `I found ${results.length} product listing(s) that match your search and budget of ₹${budget.toLocaleString("en-IN")}. Here's a quick shortlist:`
              : `I found ${results.length} product listing(s) for your search. Here's a quick shortlist:`;
            listingCount = results.length;
            const cards = results.slice(0, 6).map((p: ProductCard, index: number) => ({ ...p, id: p.id || `${index}-${p.title}` }));
            productCards = cards;
            const shownCount = cards.length;
            reply = `${intro} I’m showing ${shownCount} of the ${results.length} listings here so you can review them without a crowded wall of results. Open a retailer listing to confirm its current price, availability, specifications, and return policy.\n\nWhat matters most: design, comfort, durability, or value for money? I can help compare the details available in the listings, and I’ll flag anything that can’t be verified. A product being within budget does not by itself authorize a purchase—review your spending mandate before checkout.`;
          } else {
            reply = data.configured === false
              ? `I recognised this as a product search: “${query || "a product"}”${budget ? ` with a ₹${budget.toLocaleString("en-IN")} budget` : ""}. Live product cards are unavailable because no product-data provider is configured. ${typeof data.message === "string" ? data.message : "Configure Channel3 or SerpApi in the server environment, then retry."} You can still open Product search to search retailer sites.`
              : `I searched for “${query || "a product"}”${budget ? ` under ₹${budget.toLocaleString("en-IN")}` : ""}, but the provider returned no matching listings. Try a shorter query or open Product search to compare retailer results. I won't invent prices, ratings, or availability.`;
          }
        } else if (/\b(hello|hi\b|hey|good morning|good evening)\b/.test(low)) {
          reply = "Hey! What are you trying to get done? I can help you discover and compare products, think through a purchase, define price targets, or review spending. Ask naturally—I'll adapt the answer to your request. I'll also be clear about which tools are actually connected.";
        } else {
          reply = "I can help with product discovery, comparisons, purchase planning, price-target planning, and finance organisation. Tell me what you're trying to achieve and any constraints—such as budget, preferred brands, must-have features, or deadline. I'll choose a useful format for the question rather than forcing every answer into the same template. If live data or an integration is needed, I'll say so clearly.";
        }
      } catch {
        reply = "I understood your request, but the connected product search couldn't be reached just now. You can retry from Product search. I won't make up live prices, ratings, availability, or claim that an action was completed.";
      }

      const assistantMessage: Message = { id: id(), role: "assistant", text: reply, time: now(), products: productCards, listingCount };
      patchConversation(active.id, (c) => ({ ...c, messages: [...c.messages, assistantMessage], updated: Date.now() }));
      setStatus("Waiting for you");
    }, 250);
  }
  function createAgent() {
    if (!agentName.trim()) return;
    const created: Agent = { id: id(), name: agentName.trim(), kind: "Custom", icon: "CA", description: agentPurpose.trim() || "Custom agent configured by you.", tools: newAgentTools, status: "Ready" };
    setAgents((old) => [...old, created]); setCreateOpen(false); setAgentName(""); setAgentPurpose(""); setNewAgentTools(["web"]); newChat(created.id);
    setNotice("Agent created. Tool actions remain limited to the integrations currently connected."); window.setTimeout(() => setNotice(""), 4500);
  }
  function toggleTool(toolId: string) {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return;
    if (!tool.connected) {
      setNotice(toolId === "payments" ? "Payments require a supported provider integration and explicit approval. This toggle cannot connect a provider." : "This integration is not connected yet. The tool remains unavailable until configured.");
      window.setTimeout(() => setNotice(""), 4500); return;
    }
    setAgents((old) => old.map((a) => a.id === agent.id ? { ...a, tools: a.tools.includes(toolId) ? a.tools.filter((t) => t !== toolId) : [...a.tools, toolId] } : a));
  }

  return (
    <div className="agent-hub min-h-screen bg-[#f7f8fa] text-[#172033]">
      <div className="flex min-h-screen">
        <aside className="agent-sidebar flex w-[260px] shrink-0 flex-col border-r border-[#e8ebf0] bg-white px-3 py-5 max-lg:w-[220px] max-md:hidden">
          <a href="/" className="mb-8 flex items-center gap-2 px-3 text-[19px] font-semibold tracking-tight text-[#234fa4]"><span className="grid h-7 w-7 grid-cols-2 gap-[3px]"><i className="rounded-[3px] bg-[#315bff]"/><i className="rounded-[3px] bg-[#315bff]/50"/><i className="rounded-[3px] bg-[#315bff]/50"/><i className="rounded-[3px] bg-[#315bff]/20"/></span>Veltrio</a>
          <button onClick={() => newChat()} className="mb-5 flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e3e7ee] text-sm font-medium text-[#344054] hover:bg-[#f8faff]"><Plus size={16}/> New chat</button>
          <label className="mb-2 flex h-9 items-center gap-2 rounded-lg bg-[#f6f7f9] px-3 text-[#98a2b3]"><Search size={15}/><input aria-label="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" className="w-full bg-transparent text-xs text-[#344054] outline-none placeholder:text-[#98a2b3]"/></label>
          <div className="mt-3 flex items-center justify-between px-2 pb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[#98a2b3]"><span>Recent chats</span><History size={13}/></div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {visibleConversations.map((c) => <button key={c.id} onClick={() => {setActiveId(c.id);setActiveView("chat");}} className={"flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] leading-5 transition " + (c.id === activeId ? "bg-[#eef3ff] text-[#254bb7]" : "text-[#667085] hover:bg-[#f8f9fb]")}><MessageSquare size={15} className="mt-1 shrink-0"/><span className="truncate">{c.title}</span></button>)}
            {!visibleConversations.length && <p className="px-3 py-4 text-xs text-[#98a2b3]">No matching chats</p>}
          </div>
          <div className="my-4 border-t border-[#edf0f4]"/>
          <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[#98a2b3]"><span>Your agents</span><button aria-label="Create agent" onClick={() => setCreateOpen(true)}><Plus size={15}/></button></div>
          {agents.slice(0, 5).map((a) => <button key={a.id} onClick={() => chooseAgent(a)} className={"flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] " + (a.id === agent.id ? "bg-[#f4f6fa] text-[#172033]" : "text-[#667085] hover:bg-[#f8f9fb]")}><span className="grid h-6 w-6 place-items-center rounded-md bg-[#f0f3f8] text-sm">{a.icon}</span><span className="min-w-0 flex-1 truncate">{a.name}</span><span className={"h-1.5 w-1.5 rounded-full " + (a.status === "Ready" ? "bg-emerald-500" : "bg-amber-400")}/></button>)}
          <button onClick={() => setCreateOpen(true)} className="mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#315bff] hover:text-[#2446d8]"><Plus size={14}/> Create an agent</button>
          <div className="mt-5 rounded-xl border border-[#e9edf4] bg-[#fafbfc] p-3"><div className="mb-1 flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={14} className="text-[#315bff]"/> You stay in control</div><p className="text-[11px] leading-4 text-[#98a2b3]">Agents must ask before payments or consequential actions.</p></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[66px] shrink-0 items-center justify-between border-b border-[#e8ebf0] bg-white/90 px-6 max-sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-lg">{agent.icon}</span>
              <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-semibold">{activeView === "tools" ? "Tools & integrations" : agent.name}</h1><ChevronDown size={14} className="text-[#98a2b3]"/></div><p className="text-[11px] text-[#98a2b3]">{activeView === "tools" ? "Manage tool access" : agent.description}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-[#e4e7ec] px-2.5 py-1 text-[11px] text-[#667085] sm:inline-flex sm:items-center sm:gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{status}</span>
              <Link href="/shop" className="flex h-9 items-center gap-2 rounded-lg border border-[#dbe4ff] bg-[#eef2ff] px-3 text-xs font-medium text-[#315bff] hover:bg-[#e4eaff]"><ShoppingBag size={14}/><span className="hidden sm:inline">Product search</span></Link>
              <Link href="/mandates" className="flex h-9 items-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-3 text-xs font-medium text-[#344054] transition hover:border-[#cbd6ff] hover:bg-[#f7f8ff] hover:text-[#315bff]"><ShieldCheck size={14}/><span className="hidden sm:inline">Mandates</span></Link>
              <button onClick={() => setActiveView(activeView === "tools" ? "chat" : "tools")} className={"flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium " + (activeView === "tools" ? "border-[#cbd6ff] bg-[#eef2ff] text-[#315bff]" : "border-[#e4e7ec] text-[#475467] hover:bg-[#f8f9fb]")}><Wrench size={14}/><span className="hidden sm:inline">Tools</span></button>
              <button onClick={() => setRightOpen(!rightOpen)} aria-label="Toggle agent details" className="grid h-9 w-9 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] hover:bg-[#f8f9fb]"><Settings2 size={16}/></button>
              <button aria-label="More options" className="grid h-9 w-8 place-items-center text-[#98a2b3]"><MoreHorizontal size={18}/></button>
            </div>
          </header>

          <PageGuide compact eyebrow="Agent workspace" title="What this page is for" purpose="Use the Hub for product research, purchase planning, and reviewing local spending records. Each agent has a narrow role; the workspace helps you prepare a decision rather than pretending to execute a transaction." steps={["Choose an agent or start a new chat.", "State the goal, budget, and constraints.", "Review results and verify retailer details.", "Use Mandates and the Gateway demo to explore spending controls."]} note="Tool connections are limited. The PayPal flow is sandbox-only and requires credentials; merchant checkout, production payments, external account access, and automatic price monitoring are not active." links={[{ label: "Set spending rules", href: "/mandates" }, { label: "Test authorization", href: "/demo" }, { label: "Search products", href: "/shop" }, { label: "PayPal sandbox", href: "/checkout" }]} />

          {activeView === "tools" ? <section className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-7 py-9 max-sm:px-4">
            <div className="mb-7"><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1.5 text-xs font-medium text-[#315bff]"><Wrench size={13}/> Agent capabilities</div><h2 className="text-2xl font-semibold tracking-tight">Tools & integrations</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">Choose what this agent is allowed to use. A tool is only usable when its integration is connected and configured.</p></div>
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Connection status matters.</strong> Some tools below are previews only. Selecting an unconnected tool will not activate it or grant access to an external account.</div>
            <div className="grid gap-3 sm:grid-cols-2">{tools.map((t) => {const Icon=t.icon;const enabled=agent.tools.includes(t.id);return <div key={t.id} className="rounded-2xl border border-[#e5e9f0] bg-white p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f2f5fa] text-[#475467]"><Icon size={18}/></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{t.name}</h3><span className={"rounded-full px-2 py-0.5 text-[10px] font-medium " +(t.connected?"bg-emerald-50 text-emerald-700":"bg-[#f2f4f7] text-[#667085]")}>{t.connected?"Available locally":"Not connected"}</span></div><p className="mt-1 text-xs leading-5 text-[#667085]">{t.description}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-[#f0f2f5] pt-3"><span className="text-xs text-[#667085]">{enabled?"Enabled for this agent":"Disabled for this agent"}</span><button onClick={()=>toggleTool(t.id)} aria-label={(enabled?"Disable ":"Enable ")+t.name} className={enabled&&t.connected?"text-[#315bff]":"text-[#c4cad4]"}>{enabled&&t.connected?<ToggleRight size={26}/>:<ToggleLeft size={26}/>}</button></div></div>})}</div>
            <button onClick={()=>setCreateOpen(true)} className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[#cbd5e1] px-4 py-3 text-sm font-medium text-[#475467] hover:border-[#315bff] hover:text-[#315bff]"><Plus size={16}/> Create an agent with selected tools</button>
          </section> : <>
            <section className="flex-1 overflow-y-auto px-6 pb-6 max-sm:px-4">
              <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col">
                {active.messages.length === 0 && <div className="flex flex-1 flex-col items-center justify-center py-16 text-center"><span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#eef2ff] text-[#315bff]"><Sparkles size={26}/></span><h2 className="text-3xl font-semibold tracking-tight max-sm:text-2xl">What can I help you with?</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#667085]">Choose an agent or describe a task. You’ll see options in the conversation and stay in control of every action.</p><div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">{[{icon:ShoppingBag,title:"Find the right product",sub:"Compare options and prices",text:"Help me compare headphones under ₹5,000"},{icon:Store,title:"Plan a food order",sub:"Check details before ordering",text:"Help me order a Margherita pizza with extra cheese"},{icon:CreditCard,title:"Review subscriptions",sub:"Understand recurring costs",text:"Help me review my subscriptions"},{icon:Compass,title:"Research something",sub:"Explore options and trade-offs",text:"Research the best options for me"}].map((s)=>{const Icon=s.icon;return <button key={s.title} onClick={()=>sendMessage(s.text)} className="flex items-start gap-3 rounded-2xl border border-[#e4e7ec] bg-white p-4 text-left transition hover:border-[#c6d2ff] hover:shadow-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f6fa] text-[#475467]"><Icon size={17}/></span><span><span className="block text-sm font-medium">{s.title}</span><span className="mt-1 block text-xs text-[#98a2b3]">{s.sub}</span></span></button>})}</div></div>}
                {active.messages.map((m) => (
                  <div key={m.id} className={"flex gap-3 py-5 " + (m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#315bff] text-white"><Sparkles size={15}/></span>}
                    <div className={"max-w-[min(100%,680px)] " + (m.role === "user" ? "order-first" : "")}>
                      <div className={"rounded-2xl px-4 py-3 text-[14px] leading-6 " + (m.role === "user" ? "rounded-tr-md bg-[#edf2ff] text-[#1f3676]" : "rounded-tl-md border border-[#e9edf2] bg-white text-[#344054]")}>{m.text}</div>
                      {m.role === "assistant" && m.products && m.products.length > 0 && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {m.products.map((product) => (
                            <article key={product.id} className="overflow-hidden rounded-xl border border-[#e5e9f0] bg-white shadow-sm">
                              <div className="relative flex h-40 items-center justify-center bg-[#f8fafc] p-3">
                                <div className="flex flex-col items-center gap-2 text-xs text-[#98a2b3]"><ShoppingBag size={24}/><span>Product preview</span></div>
                                {product.image && <img src={product.image} alt={product.title} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-contain p-3" />}
                              </div>
                              <div className="p-3">
                                <h3 className="line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-[#172033]">{product.title}</h3>
                                <p className="mt-2 text-base font-bold text-[#172033]">{product.price || "Price unavailable"}</p>
                                <p className="mt-1 text-[11px] text-[#667085]">{product.retailer || "Retailer"}{product.rating ? ` · ★ ${product.rating.toFixed(1)}` : ""}{product.reviews ? ` (${product.reviews.toLocaleString()} reviews)` : ""}</p>
                                {product.delivery && <p className="mt-1 text-[11px] text-[#667085]">{product.delivery}</p>}
                                <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#315bff] px-3 text-xs font-semibold text-white hover:bg-[#2446d8]">View product <ExternalLink size={13}/></a>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                      {m.role === "assistant" && m.products && m.products.length > 0 && (
                        <div className="mt-3 rounded-xl border border-[#e3e9f7] bg-[#f8faff] p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold text-[#253b75]">Your shortlist</p>
                            <p className="text-[11px] text-[#667085]">Showing {m.products.length} of {m.listingCount ?? m.products.length} listings</p>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#667085]">Compare the available price, retailer, rating, and delivery details. Missing specifications are not assumed.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href="/mandates" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#315bff] px-3 text-xs font-semibold text-white hover:bg-[#2446d8]"><ShieldCheck size={13}/> Review spending rules</Link>
                            <Link href="/demo" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d8e0f5] bg-white px-3 text-xs font-semibold text-[#344054] hover:bg-[#f1f5ff]"><ShieldCheck size={13}/> Test authorization</Link>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-[#667085]">These actions review your rules and test the gateway demo; they do not place an order or charge a payment method.</p>
                        </div>
                      )}
                      {m.role === "assistant" && <div className="mt-2 flex items-center gap-3 px-1 text-[10px] text-[#98a2b3]"><span>{m.time}</span><span>·</span><span>Veltrio agent</span></div>}
                    </div>
                    {m.role === "user" && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e4e7ec] text-xs font-semibold text-[#475467]">You</span>}
                  </div>
                ))}
                {["Researching", "Searching products", "Thinking"].includes(status) && <div className="flex items-center gap-3 py-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#eef2ff] text-[#315bff]"><Sparkles size={15}/></span><div className="flex items-center gap-2 rounded-xl border border-[#e9edf2] bg-white px-4 py-3 text-xs text-[#667085]"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#315bff]"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#315bff] [animation-delay:120ms]"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#315bff] [animation-delay:240ms]"/></span>Thinking through your request…</div></div>}
                <div ref={bottomRef}/>
              </div>
            </section>
            <div className="shrink-0 px-5 pb-4 pt-2 max-sm:px-3">
              <div className="mx-auto max-w-[900px] rounded-2xl border border-[#dfe4eb] bg-white shadow-[0_3px_12px_rgba(16,24,40,.04)] transition focus-within:border-[#b9c8ff] focus-within:shadow-[0_0_0_3px_rgba(49,91,255,.08)]">
                <textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} rows={2} placeholder={"Message " + agent.name + "…"} className="max-h-40 min-h-[54px] w-full resize-y bg-transparent px-4 pt-4 text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]" aria-label="Message your agent"/>
                <div className="flex items-center justify-between px-3 pb-3"><div className="flex items-center gap-1.5"><button onClick={()=>setActiveView("tools")} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-[#667085] hover:bg-[#f4f6f9]"><Wrench size={13}/> Tools <span className="rounded bg-[#f2f4f7] px-1.5 py-0.5">{agent.tools.filter((id)=>tools.find((t)=>t.id===id)?.connected).length} active</span></button><span className="hidden text-[10px] text-[#b0b8c5] sm:inline">Enter to send · Shift + Enter for a new line</span></div><button onClick={()=>sendMessage()} disabled={!input.trim()} className="grid h-8 w-8 place-items-center rounded-xl bg-[#315bff] text-white transition hover:bg-[#2446d8] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]" aria-label="Send message"><ArrowUp size={17}/></button></div>
              </div>
              <p className="mx-auto mt-2 max-w-[900px] text-center text-[10px] leading-4 text-[#98a2b3]">Veltrio can make mistakes. Live data and external actions require connected tools; payments and orders always need your confirmation.</p>
            </div>
          </> }
        </main>

        {rightOpen && <aside className="agent-details w-[270px] shrink-0 border-l border-[#e8ebf0] bg-white px-4 py-5 max-xl:hidden"><div className="mb-5 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.12em] text-[#667085]">Agent details</h2><button onClick={()=>setRightOpen(false)} aria-label="Close agent details" className="text-[#98a2b3]"><X size={15}/></button></div>
          <div className="rounded-2xl border border-[#e7ebf2] bg-[#fafbfc] p-4"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#eef2ff] text-xl">{agent.icon}</div><h3 className="text-sm font-semibold">{agent.name}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{agent.description}</p><div className="mt-3 flex items-center gap-2 border-t border-[#e9edf2] pt-3 text-xs"><span className={"h-2 w-2 rounded-full " + (status==="Researching"?"animate-pulse bg-blue-500":"bg-emerald-500")}/><span className="text-[#475467]">{status}</span></div></div>
          <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-[#344054]">Tools available</h3><button onClick={()=>setActiveView("tools")} className="text-[11px] font-medium text-[#315bff]">Manage</button></div><div className="space-y-3">{agent.tools.map((toolId)=>{const t=tools.find((x)=>x.id===toolId);if(!t)return null;const Icon=t.icon;return <div key={toolId} className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f6f9] text-[#667085]"><Icon size={15}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-[#344054]">{t.name}</p><p className="text-[10px] text-[#98a2b3]">{t.connected?"Available":"Not connected"}</p></div><span className={"h-1.5 w-1.5 rounded-full "+(t.connected?"bg-emerald-500":"bg-[#d0d5dd]")}/></div>})}</div></div>
          <div className="mt-6 rounded-xl border border-[#e6eaf2] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#344054]"><ShieldCheck size={14} className="text-[#315bff]"/> Permission policy</div><p className="text-[11px] leading-5 text-[#667085]">This agent can’t make purchases, payments, or trades from this prototype. Explicit approval and a supported provider are required before real execution.</p></div>
          <button onClick={()=>setCreateOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e4e7ec] py-2.5 text-xs font-medium text-[#475467] hover:bg-[#f8f9fb]"><Settings2 size={14}/> Configure agent</button>
        </aside>}
      </div>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-[#172033] px-4 py-3 text-xs text-white shadow-xl">{notice}</div>}
      {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/35 p-4" onMouseDown={(e)=>{if(e.target===e.currentTarget)setCreateOpen(false);}}><div role="dialog" aria-modal="true" aria-labelledby="create-agent-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e5e9f0] bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold text-[#315bff]"><Sparkles size={12}/> CUSTOM AGENT</span><h2 id="create-agent-title" className="text-xl font-semibold">Create an agent</h2><p className="mt-1 text-xs leading-5 text-[#667085]">Give it a purpose and choose the tools it may use.</p></div><button onClick={()=>setCreateOpen(false)} aria-label="Close dialog" className="text-[#98a2b3]"><X size={18}/></button></div><label className="mb-4 block text-xs font-medium text-[#344054]">Agent name<input value={agentName} onChange={(e)=>setAgentName(e.target.value)} placeholder="e.g. Laptop Research Agent" className="mt-2 h-10 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#315bff]"/></label><label className="mb-5 block text-xs font-medium text-[#344054]">What should this agent do?<textarea value={agentPurpose} onChange={(e)=>setAgentPurpose(e.target.value)} rows={3} placeholder="Describe its goal, preferences, budget limits, and boundaries…" className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm outline-none focus:border-[#315bff]"/></label><div className="mb-2 text-xs font-medium text-[#344054]">Allowed tools</div><div className="mb-6 space-y-2">{tools.map((t)=>{const Icon=t.icon;return <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#edf0f4] p-3 hover:bg-[#fafbfc]"><input type="checkbox" checked={newAgentTools.includes(t.id)} onChange={(e)=>setNewAgentTools((old)=>e.target.checked?[...old,t.id]:old.filter((x)=>x!==t.id))} className="accent-[#315bff]"/><Icon size={16} className="text-[#667085]"/><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{t.name}</span><span className="block text-[10px] text-[#98a2b3]">{t.connected?"Available locally":"Not connected yet"}</span></span></label>})}</div><div className="mb-4 rounded-lg bg-[#f8faff] p-3 text-[11px] leading-5 text-[#667085]">Creating an agent saves its configuration in this browser. It does not connect new external services or grant payment permissions.</div><div className="flex justify-end gap-2"><button onClick={()=>setCreateOpen(false)} className="rounded-lg border border-[#e4e7ec] px-4 py-2 text-xs font-medium text-[#475467]">Cancel</button><button onClick={createAgent} disabled={!agentName.trim()} className="rounded-lg bg-[#315bff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Create agent</button></div></div></div>}
    </div>
  );
}
