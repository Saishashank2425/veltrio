"use client";

import { motion } from "framer-motion";
import { Lock, BookOpen, Users, Cpu } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";

const principles = [
  {
    icon: Lock,
    title: "Deterministic, not probabilistic",
    description:
      "The gateway demo evaluates structured proposals with deterministic conditions. It does not rely on a language model to make the final sample decision.",
  },
  {
    icon: Users,
    title: "You set the rules. We enforce them.",
    description:
      "The intended design is to evaluate a configured policy rather than invent a reason to spend. The current demo uses sample policy rules; saved mandate drafts are not connected to it.",
  },
  {
    icon: BookOpen,
    title: "Full audit trail",
    description:
      "The demo exposes decision reasons and an in-memory audit trail. Durable storage, identity, and production audit controls are not yet implemented.",
  },
  {
    icon: Cpu,
    title: "Agent-agnostic",
    description:
      "The gateway API is designed to accept structured HTTP proposals. Production integrations, credentials, payment providers, and external agent onboarding are not connected in this prototype.",
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
            Four principles behind the design.
          </h2>
          <p className="mt-4 text-ivory/50 max-w-md mx-auto text-base">
            These are the intended properties of the authorization layer. This hackathon prototype demonstrates selected behaviours; it is not a production payment security product.
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
