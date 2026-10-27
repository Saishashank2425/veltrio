"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CallToAction() {
  return (
    <section className="bg-navy-deep py-28 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-ivory tracking-tight leading-tight">
            See the authorization flow
            <br />
            in action.
          </h2>

          <p className="text-ivory/50 text-base leading-relaxed max-w-md mx-auto">
            Run the interactive demo — submit a purchase proposal as an AI
            agent, set rules, and watch the gateway enforce them in real time.
          </p>

          <Link href="/demo">
            <Button variant="primary" size="lg" className="gap-2">
              Try the demo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <p className="text-xs text-ivory/25 tracking-wide">
            Prototype environment · Sample policy data · No real payments
          </p>
        </motion.div>
      </div>
    </section>
  );
}
