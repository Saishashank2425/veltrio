"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentHeroDemo } from "@/components/sections/AgentHeroDemo";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* -------------------------------------------------------
   Gateway Diagram — pure SVG, no images
   ------------------------------------------------------- */
function GatewayDiagram() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none rounded-3xl border border-ivory/10 bg-gradient-to-br from-navy-mid/70 to-navy-deep/60 p-3 sm:p-5 shadow-2xl shadow-black/25" aria-hidden>
      <svg
        viewBox="0 0 480 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        {/* Connecting lines */}
        <line className="gateway-flow" x1="120" y1="120" x2="190" y2="120" stroke="#315BFF" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
        <line className="gateway-flow" x1="290" y1="120" x2="340" y2="80" stroke="#16794B" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
        <line className="gateway-flow" x1="290" y1="120" x2="340" y2="160" stroke="#B42318" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />

        {/* AI Agent node */}
        <rect x="20" y="92" width="100" height="56" rx="8" fill="#FFFFFF" stroke="#315BFF" strokeWidth="1" strokeOpacity="0.4" />
        <text x="70" y="114" textAnchor="middle" fill="#111827" fontSize="10" fontWeight="600">AI Agent</text>
        <text x="70" y="130" textAnchor="middle" fill="#315BFF" fontSize="9" opacity="0.8">proposes</text>
        <text x="70" y="144" textAnchor="middle" fill="#315BFF" fontSize="9" opacity="0.8">a purchase</text>

        {/* Gateway node */}
        <rect x="188" y="80" width="104" height="80" rx="8" fill="#FFFFFF" stroke="#315BFF" strokeWidth="1.5" strokeOpacity="0.8" />
        <text x="240" y="108" textAnchor="middle" fill="#315BFF" fontSize="10" fontWeight="700" letterSpacing="0.05em">GATEWAY</text>
        <text x="240" y="124" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.6">checks rules</text>
        <text x="240" y="138" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.6">deterministically</text>
        <text x="240" y="152" textAnchor="middle" fill="#111827" fontSize="8" opacity="0.4">≤ 2ms</text>

        {/* Approved node */}
        <rect x="340" y="44" width="120" height="52" rx="8" fill="#FFFFFF" stroke="#16794B" strokeWidth="1" strokeOpacity="0.7" />
        <text x="400" y="67" textAnchor="middle" fill="#16794B" fontSize="10" fontWeight="600">✓ Approved</text>
        <text x="400" y="82" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.5">proposal is evaluated</text>
        <text x="400" y="92" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.5">+ audit log</text>

        {/* Blocked node */}
        <rect x="340" y="144" width="120" height="52" rx="8" fill="#FFFFFF" stroke="#B42318" strokeWidth="1" strokeOpacity="0.7" />
        <text x="400" y="167" textAnchor="middle" fill="#B42318" fontSize="10" fontWeight="600">✗ Blocked</text>
        <text x="400" y="182" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.5">rule violated</text>
        <text x="400" y="192" textAnchor="middle" fill="#111827" fontSize="9" opacity="0.5">+ reason logged</text>

        {/* Ambient ring */}
        <circle className="gateway-ring" cx="240" cy="120" r="52" stroke="#315BFF" strokeWidth="0.5" opacity="0.15" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------
   Hero Section
   ------------------------------------------------------- */
export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-start lg:justify-center overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 px-6">
      {/* Subtle background gradient */}
      <div aria-hidden className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full flex-none">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          {/* Left — Copy */}
          <div className="flex flex-col">
            {/* Overline */}
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-8"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              AI commerce authorization
            </motion.span>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.6, ease: EASE }}
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold text-ivory leading-[1.04] tracking-tight mb-6"
            >
              Commerce moves.
              <br />
              <span className="text-[#8FA4FF]">You stay</span>
              <br />
              in control.
            </motion.h1>

            {/* Sub-copy */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.6, ease: EASE }}
              className="text-lg text-ivory/60 leading-relaxed max-w-md mb-10"
            >
              AI agents can research and propose purchases. Veltrio is designed to put a clear policy check between that proposal and payment — so limits, merchant rules, and approval thresholds stay visible before money moves.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.6, ease: EASE }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/demo">
                <Button variant="primary" size="lg" className="gap-2">
                  Try the demo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See how it works
                </Button>
              </a>
              <Link href="/agents" className="inline-flex items-center gap-2 self-center px-1 text-sm font-medium text-ivory/70 transition hover:text-ivory">
                Open Agent Hub <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <p className="mt-5 max-w-md text-xs leading-5 text-ivory/35">Prototype: the gateway evaluates sample proposals. Merchant checkout and real payment execution are not connected.</p>

            {/* Trust signal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 mt-10 flex-wrap"
            >
              <Badge variant="approved" label="Deterministic demo rules" />
              <Badge variant="blocked" label="Explicit block outcomes" />
              <Badge variant="pending" label="Reviewable decisions" />
            </motion.div>
          </div>

          {/* Right — Interactive agent demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
            className="hidden md:flex items-center justify-center lg:justify-end"
          >
            <AgentHeroDemo />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        aria-hidden
      >
        <div className="w-px h-8 bg-gradient-to-b from-gold/40 to-transparent animate-pulse" />
        <span className="text-xs text-ivory/30 tracking-widest uppercase">scroll</span>
      </motion.div>
    </section>
  );
}
