"use client";

import { motion } from "framer-motion";

export function ProblemBridge() {
  return (
    <section className="bg-ivory py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl sm:text-3xl font-semibold text-navy leading-snug"
        >
          AI agents that shop, book, and operate on your behalf are already
          here. The question isn&apos;t whether they&apos;ll spend money —
          it&apos;s{" "}
          <span className="text-gold-dark italic">
            whether they&apos;ll respect your limits
          </span>{" "}
          when they do.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-base text-navy/60 max-w-xl mx-auto leading-relaxed"
        >
          Most authorization frameworks are probabilistic — they guess. Veltrio
          is deterministic. Every rule is a hard contract. Pass means spend.
          Fail means stop. No exceptions, no interpretation.
        </motion.p>
      </div>
    </section>
  );
}
