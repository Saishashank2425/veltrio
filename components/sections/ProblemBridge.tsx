"use client";

import { motion } from "framer-motion";

export function ProblemBridge() {
  return (
    <section className="bg-navy-deep py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl sm:text-3xl font-semibold text-ivory leading-snug"
        >
          AI agents that shop, book, and operate on your behalf are already
          here. The question isn&apos;t whether they&apos;ll spend money —
          it&apos;s{" "}
          <span className="font-display text-gold-dark italic">
            whether they&apos;ll respect your limits
          </span>{" "}
          when they do.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-base text-ivory/60 max-w-xl mx-auto leading-relaxed"
        >
          Veltrio is designed around deterministic policy checks: the same proposal and configured rules should produce the same decision. This prototype demonstrates the decision layer without connecting a live payment rail.
        </motion.p>
      </div>
    </section>
  );
}
