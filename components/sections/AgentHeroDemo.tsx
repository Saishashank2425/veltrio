"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Check, ChevronDown, Circle, Pause, Play, Plug, ShieldCheck, ShoppingBag, Sparkles, Wrench } from "lucide-react";

const examples = [
  { label: "Find headphones", prompt: "Find comfortable wireless headphones under ₹5,000" },
  { label: "Plan a food order", prompt: "Help me order a Margherita pizza with extra cheese" },
  { label: "Track a price", prompt: "Help me track a product price and set a target" },
];

const tourScenes = [
  { title: "1. Describe the task", body: "Tell the agent what you need, your budget, and the constraints it must respect.", state: "Request received" },
  { title: "2. Review the options", body: "The workspace organises the next step and shows which sources or tools are actually available.", state: "Research and compare" },
  { title: "3. Keep control", body: "A purchase proposal must pass explicit rules. This demo does not connect checkout or move money.", state: "Approval remains with you" },
];

export function AgentHeroDemo() {
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState("");
  const [agent, setAgent] = useState("Shopping Agent");
  const [showAgents, setShowAgents] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(true);
  useEffect(() => {
    if (!tourPlaying) return;
    const timer = window.setInterval(() => {
      setTourStep((current) => {
        if (current >= tourScenes.length - 1) { setTourPlaying(false); return tourScenes.length - 1; }
        return current + 1;
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [tourPlaying]);
  function startTour() { setTourStep(0); setTourPlaying(true); setSent(""); }

  function submit(value = prompt) {
    const text = value.trim();
    if (!text) return;
    setSent(text);
    setPrompt("");
  }

  return (
    <div className="relative w-full max-w-[570px] select-none">
      <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-[#315BFF]/10 blur-3xl" />
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8FA4FF]">Product walkthrough</p><p className="mt-1 text-xs text-ivory/55">An animated 3-step preview of the workflow</p></div>
        <button type="button" onClick={() => tourPlaying ? setTourPlaying(false) : (tourStep >= 0 && tourStep < 2 ? setTourPlaying(true) : startTour())} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-medium text-ivory transition hover:bg-white/10">
          {tourPlaying ? <Pause size={12}/> : <Play size={12}/>} {tourPlaying ? "Pause" : tourStep >= 0 && tourStep < 2 ? "Resume walkthrough" : "Play walkthrough"}
        </button>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#fbfcff] text-[#182230] shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between border-b border-[#e8ebf2] bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf1ff] text-[#315BFF]"><Sparkles size={17}/></div>
            <div className="relative min-w-0">
              <button onClick={() => setShowAgents(!showAgents)} className="flex items-center gap-1 text-sm font-semibold">{agent}<ChevronDown size={14}/></button>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#667085]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Prototype preview · sample responses</div>
              {showAgents && <div className="absolute left-0 top-12 z-20 w-48 rounded-xl border border-[#e4e7ec] bg-white p-1.5 shadow-xl">{["Shopping Agent","Food Agent","Headphone Finder","Finance Agent"].map(a=><button key={a} onClick={()=>{setAgent(a);setShowAgents(false);setSent("")}} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f4f6fa]">{a}</button>)}</div>}
            </div>
          </div>
          <button onClick={() => setToolOpen(!toolOpen)} className={"flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] "+(toolOpen?"border-[#c8d4ff] bg-[#eef2ff] text-[#315BFF]":"border-[#e4e7ec] text-[#667085]")}><Wrench size={13}/> Tools <span className="rounded bg-[#f2f4f7] px-1">2</span></button>
        </div>
        {toolOpen && <div className="border-b border-[#e8ebf2] bg-[#f7f8fc] px-4 py-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">Example tool access</p><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] text-emerald-700"><Check size={11}/> Web research · demo</span><span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] text-amber-700"><Plug size={11}/> Live checkout · not connected</span></div></div>}
        {tourStep >= 0 && <div className="border-b border-[#e8ebf2] bg-[#f4f6ff] px-4 py-3 sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#1f3676]">{tourScenes[tourStep].title}</p><span className="text-[10px] text-[#667085]">{tourStep + 1} / {tourScenes.length}</span></div>
          <p className="text-[11px] leading-5 text-[#52617e]">{tourScenes[tourStep].body}</p>
          <div className="mt-3 flex gap-1.5">{tourScenes.map((scene, index) => <button key={scene.title} type="button" onClick={() => { setTourStep(index); setTourPlaying(false); }} aria-label={scene.title} className={`h-1.5 flex-1 rounded-full transition ${index <= tourStep ? "bg-[#315BFF]" : "bg-[#dbe2f4]"}`}/>)}</div>
        </div>}
        <div className="min-h-[330px] bg-[#fafbfe] px-4 py-4 sm:px-5">
          {!sent ? <>
            <div className="mb-4 flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#eaf0ff] px-3.5 py-3 text-xs leading-5 text-[#24417f]">I want to find something useful. Can you help me compare options?</div></div>
            <div className="mb-4 flex items-start gap-2.5"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#315BFF] text-white"><Sparkles size={13}/></div><div className="max-w-[90%] rounded-2xl rounded-tl-md border border-[#e8ebf2] bg-white px-3.5 py-3 text-xs leading-5 text-[#475467]">Of course. Tell me what you need and your budget. I’ll help organise options and constraints. You review the result before taking any action.</div></div>
            <div className="ml-9 grid grid-cols-2 gap-2">
              <div className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white"><div className="flex h-[86px] items-center justify-center bg-[#eef2f7]"><ShoppingBag size={29} className="text-[#98a2b3]"/></div><div className="p-2.5"><p className="text-[11px] font-semibold">Product research</p><p className="mt-1 text-[10px] text-[#667085]">Compare features & prices</p></div></div>
              <div className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white"><div className="flex h-[86px] items-center justify-center bg-[#eef2f7]"><ShieldCheck size={29} className="text-[#98a2b3]"/></div><div className="p-2.5"><p className="text-[11px] font-semibold">Approval first</p><p className="mt-1 text-[10px] text-[#667085]">You control the action</p></div></div>
            </div>
          </> : <>
            <div className="mb-4 flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#eaf0ff] px-3.5 py-3 text-xs leading-5 text-[#24417f]">{sent}</div></div>
            <div className="flex items-start gap-2.5"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#315BFF] text-white"><Sparkles size={13}/></div><div className="rounded-2xl rounded-tl-md border border-[#e8ebf2] bg-white px-3.5 py-3 text-xs leading-5 text-[#475467]"><p className="font-semibold text-[#182230]">Let’s work through that.</p><p className="mt-1.5">This is a preview of the interaction pattern, not a live agent response. Check the Agent Hub for the tools and data sources currently configured.</p><div className="mt-3 flex items-center gap-2 rounded-lg bg-[#f7f8fc] p-2.5"><Circle size={12} className="text-amber-500"/><span className="text-[10px] text-[#667085]">Live integrations and checkout are not connected in this preview.</span></div><button onClick={()=>setSent("")} className="mt-3 rounded-lg border border-[#e4e7ec] px-3 py-1.5 text-[10px] font-medium text-[#475467] hover:bg-[#f8f9fb]">Try another example</button></div></div>
          </>}
          <div className="mt-5 flex flex-wrap gap-2">{examples.map(e=><button key={e.label} onClick={()=>submit(e.prompt)} className="rounded-full border border-[#e0e5ee] bg-white px-2.5 py-1.5 text-[10px] text-[#667085] transition hover:border-[#bdcbff] hover:text-[#315BFF]">{e.label}</button>)}</div>
        </div>
        <div className="border-t border-[#e8ebf2] bg-white p-3"><div className="flex items-center gap-2 rounded-xl border border-[#dfe4ec] bg-white px-3 py-2 shadow-sm"><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submit()}}} placeholder="Ask your agent anything…" className="min-w-0 flex-1 bg-transparent py-1 text-xs outline-none placeholder:text-[#98a2b3]"/><button onClick={()=>submit()} disabled={!prompt.trim()} aria-label="Send demo message" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#315BFF] text-white disabled:bg-[#cbd5e1]"><ArrowUp size={15}/></button></div><div className="mt-2 flex items-center justify-between px-1 text-[9px] text-[#98a2b3]"><span>Animated product walkthrough · not a live session</span><span className="inline-flex items-center gap-1"><ShieldCheck size={10}/> Actions require approval</span></div></div>
      </div>
      <div className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-[10px] text-ivory/80 shadow-lg sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span>Agent workspace</span><span className="text-ivory/30">·</span><span>Tool access controls</span></div>
    </div>
  );
}
