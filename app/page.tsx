import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ProblemBridge } from "@/components/sections/ProblemBridge";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { SpendingControl } from "@/components/sections/SpendingControl";
import { TrustSection } from "@/components/sections/TrustSection";
import { CallToAction } from "@/components/sections/CallToAction";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section className="bg-[#0a1524] px-6 py-20 sm:py-24" aria-labelledby="workspace-heading">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8FA4FF]">Explore the product</p>
              <h2 id="workspace-heading" className="mt-3 text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">One clear purpose for every workspace.</h2>
              <p className="mt-4 text-sm leading-6 text-ivory/60 sm:text-base">Research options, write down your spending rules, and test how a policy decision is made. Each page explains what it does and what is still a prototype.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/agents", number: "01", title: "Agent Hub", desc: "Start a task, research products, and inspect available tools.", action: "Open workspace", Icon: Search },
                { href: "/shop", number: "02", title: "Product search", desc: "Search listings and verify final details with the retailer.", action: "Compare options", Icon: SlidersHorizontal },
                { href: "/mandates", number: "03", title: "Spending mandates", desc: "Draft limits, merchant rules, and approval thresholds for review.", action: "Draft a mandate", Icon: ShieldCheck },
                { href: "/demo", number: "04", title: "Gateway demo", desc: "Submit a sample proposal and inspect ALLOW, BLOCK, or ESCALATE.", action: "Test a decision", Icon: WalletCards },
              ].map(({ href, number, title, desc, action, Icon }) => (
                <Link key={href} href={href} className="group flex min-h-[230px] flex-col rounded-2xl border border-white/10 bg-white/[.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#315BFF]/50 hover:bg-white/[.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-[.14em] text-[#8FA4FF]">{number}</span>
                    <Icon size={18} className="text-[#8FA4FF]" strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-7 text-lg font-semibold text-ivory">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ivory/55">{desc}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#8FA4FF]">{action}<ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-ivory/35">Finance workspace: keep a manual, browser-local record of transactions and recurring obligations. No bank connection is active.</p>
            <div className="mt-3"><Link href="/finance" className="inline-flex items-center gap-2 text-sm font-medium text-ivory/70 transition hover:text-white">Open finance workspace <ArrowRight size={15}/></Link></div>
          </div>
        </section>
        <ProblemBridge />
        <HowItWorks />
        <SpendingControl />
        <TrustSection />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
