"use client";

import { motion } from "framer-motion";
import { Lock, BookOpen, Users, Cpu } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";

const principles = [
  {
    icon: Lock,
    title: "Deterministic, not probabilistic",
    description:
      "Rules execute exactly as written. A \$500 limit means \$500 — not \$499.99 and not \$501 under 'extenuating circumstances.' No model is consulted at authorization time.",
  },
  {
    icon: Users,
    title: "You set the rules. We enforce them.",
    description:
      "Veltrio has no discretion over what gets authorized. The system runs your policy, not its own judgment. If a rule doesn't exist for a case, the decision defaults to blocked.",
  },
  {
    icon: BookOpen,
    title: "Full audit trail",
    description:
      "Every decision — approved or blocked — is logged with the exact rule evaluated, the values compared, the outcome, and a machine-readable reason code. Disputes are resolvable.",
  },
  {
    icon: Cpu,
    title: "Agent-agnostic",
    description:
      "Veltrio is a gateway, not a platform. It works with any AI agent that can make an HTTP request. No proprietary SDK required. Agents submit proposals; Veltrio decides.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="bg-navy py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel light>Principles</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold text-ivory tracking-tight">
            Built on four guarantees.
          </h2>
          <p className="mt-4 text-ivory/50 max-w-md mx-auto text-base">
            Not promises. Not marketing claims. Four properties you can verify
            in the code.
          </p>
        </div>

        {/* Principle cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: i * 0.1,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group p-7 sm:p-8 rounded-2xl border border-ivory/10 bg-gradient-to-br from-navy-mid/55 to-navy-deep/40 shadow-lg shadow-black/10
                         hover:-translate-y-1 hover:border-gold/25 hover:shadow-xl hover:shadow-black/20 transition-all duration-300"
            >
              <div
                className="w-10 h-10 rounded-lg border border-gold/30 bg-gold/8 flex items-center justify-center mb-5
                            group-hover:border-gold/50 group-hover:bg-gold/12 transition-all"
              >
                <p.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-ivory mb-3">{p.title}</h3>
              <p className="text-sm text-ivory/55 leading-relaxed">{p.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center text-xs text-ivory/25 mt-12 tracking-wide"
        >
          Hackathon demo · No real financial transactions · No third-party credentials required
        </motion.p>
      </div>
    </section>
  );
}
