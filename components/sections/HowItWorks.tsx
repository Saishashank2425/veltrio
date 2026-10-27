"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Shield, FileText } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StepCard } from "@/components/ui/StepCard";

const steps = [
  {
    step: 1,
    icon: ShoppingCart,
    title: "Agent proposes a purchase",
    description:
      "Your AI agent identifies a transaction it wants to execute — a supplier invoice, a SaaS subscription, a travel booking — and submits the details to the Veltrio gateway.",
  },
  {
    step: 2,
    icon: Shield,
    title: "Gateway checks your rules",
    description:
      "Veltrio evaluates the proposal against your exact spending rules: vendor allowlists, per-category budgets, approval thresholds, time windows. No inference. No guessing.",
  },
  {
    step: 3,
    icon: FileText,
    title: "Approved or blocked — with a full audit trail",
    description:
      "The gateway returns ALLOW, BLOCK, or ESCALATE and records the decision with a reason. This prototype demonstrates authorization logic; it does not execute a merchant checkout or move money.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-navy py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel light>How it works</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold text-ivory tracking-tight">
            Three steps. Zero ambiguity.
          </h2>
          <p className="mt-4 text-ivory/50 max-w-lg mx-auto text-base">
            Every submitted demo proposal follows the same rule-evaluation path. The current proof focuses on the decision and audit trail, not real payment execution.
          </p>
        </div>

        {/* Step cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                delay: i * 0.12,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <StepCard {...step} />
            </motion.div>
          ))}
        </div>

        {/* Connector label */}
        <div className="hidden md:flex items-center justify-center gap-4 mt-8 text-xs text-ivory/25 tracking-widest uppercase">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-gold/20" />
          Rules run in order · Fail closed · Full log generated
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-gold/20" />
        </div>
      </div>
    </section>
  );
}
