"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";

type PageGuideProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  steps: string[];
  note?: string;
  compact?: boolean;
  links?: { label: string; href: string }[];
};

export function PageGuide({ eyebrow, title, purpose, steps, note, compact = false, links = [] }: PageGuideProps) {
  return (
    <section aria-label={`How to use ${title}`} className={`mx-auto w-full max-w-6xl ${compact ? "px-5 py-4" : "px-5 py-6"}`}>
      <div className="overflow-hidden rounded-2xl border border-[#dfe5f0] bg-white shadow-[0_4px_18px_rgba(16,24,40,.035)]">
        <div className={`grid gap-5 ${compact ? "p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.9fr)]" : "p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]"}`}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#315bff]">{eyebrow}</p>
            <h2 className="mt-1.5 text-base font-semibold tracking-tight text-[#172033]">{title}</h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#667085]">{purpose}</p>
            {note && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{note}</p>}
            {links.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{links.map(link => <Link key={link.href} href={link.href} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#315bff] hover:text-[#2446d8]">{link.label}<ArrowRight size={12}/></Link>)}</div>}
          </div>
          <div className="grid content-start gap-2 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="flex items-start gap-2.5 rounded-xl bg-[#f7f8fc] p-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#dbe4ff] bg-white text-[10px] font-semibold text-[#315bff]">{index + 1}</span>
                <span className="text-[11px] leading-5 text-[#475467]">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-[#edf0f5] bg-[#fbfcfe] px-5 py-2.5 text-[10px] text-[#7b8798]">
          <BookOpen size={12} />
          <span>Purpose and usage guide</span>
          <span className="mx-1 text-[#d0d5dd]">·</span>
          <CheckCircle2 size={12} className="text-[#315bff]" />
          <span>Review every result before acting</span>
        </div>
      </div>
    </section>
  );
}
