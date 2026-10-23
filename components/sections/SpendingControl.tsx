"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RuleCard } from "@/components/ui/RuleCard";
import { Badge } from "@/components/ui/Badge";

/* ---- Static demo data ---- */
const rules = [
  {
    category: "Software & SaaS",
    description: "No new subscriptions without escalation",
    limit: "\$0",
    period: "per transaction",
    used: "\$0",
    usedPercent: 0,
  },
  {
    category: "Travel",
    description: "Total monthly travel budget",
    limit: "\$2,000",
    period: "per month",
    used: "\$1,340",
    usedPercent: 67,
  },
  {
    category: "Vendors",
    description: "Max per-vendor spend (allowlisted vendors only)",
    limit: "\$500",
    period: "per transaction",
    used: undefined,
    usedPercent: 0,
  },
  {
    category: "Operating Expenses",
    description: "Monthly ops ceiling across all agents",
    limit: "\$5,000",
    period: "per month",
    used: "\$4,780",
    usedPercent: 96,
  },
];

type DecisionVariant = "approved" | "blocked" | "pending";

const decisions: {
  id: string;
  agent: string;
  description: string;
  amount: string;
  status: DecisionVariant;
  reason: string;
  time: string;
}[] = [
  {
    id: "d1",
    agent: "ProcureBot",
    description: "AWS EC2 reserved instance — 1yr",
    amount: "\$1,200",
    status: "blocked",
    reason: "Vendor not on allowlist",
    time: "2s ago",
  },
  {
    id: "d2",
    agent: "TravelBot",
    description: "SFO → NYC flight — economy",
    amount: "\$380",
    status: "approved",
    reason: "Within travel budget",
    time: "14s ago",
  },
  {
    id: "d3",
    agent: "OpsBot",
    description: "Slack Pro upgrade",
    amount: "\$87.50/mo",
    status: "blocked",
    reason: "Subscription rule: requires escalation",
    time: "1m ago",
  },
  {
    id: "d4",
    agent: "ProcureBot",
    description: "Office supplies — Staples",
    amount: "\$64",
    status: "approved",
    reason: "All rules passed",
    time: "3m ago",
  },
  {
    id: "d5",
    agent: "OpsBot",
    description: "Datadog usage overage",
    amount: "\$312",
    status: "pending",
    reason: "Monthly ops budget near ceiling",
    time: "5m ago",
  },
];

export function SpendingControl() {
  return (
    <section id="spending-control" className="bg-navy-deep py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14">
          <SectionLabel light>Spending Control</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold text-ivory tracking-tight max-w-xl">
            Your rules. Enforced exactly.
          </h2>
          <p className="mt-4 text-ivory/50 max-w-lg text-base">
            Define the constraints once. Every agent — every transaction —
            runs through the same gateway. No discretion, no drift.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Rules panel */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-ivory/80 tracking-wide">
                Active Rules
              </h3>
              <span className="text-xs text-ivory/30">{rules.length} rules</span>
            </div>
            {rules.map((rule, i) => (
              <motion.div
                key={rule.category}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <RuleCard {...rule} />
              </motion.div>
            ))}
          </motion.div>

          {/* Decision feed */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-ivory/80 tracking-wide">
                Decision Feed
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-approved">
                <span className="w-1.5 h-1.5 rounded-full bg-approved animate-pulse" />
                Live
              </span>
            </div>

            <div className="space-y-3">
              {decisions.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                  className="flex items-start gap-3 p-4 rounded-lg border border-ivory/8 bg-navy-mid/40
                             hover:border-ivory/15 transition-colors"
                >
                  <Badge variant={d.status} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium text-ivory truncate">
                        {d.description}
                      </p>
                      <span className="text-sm font-semibold text-ivory/70 shrink-0">
                        {d.amount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-ivory/40 truncate">
                        <span className="text-ivory/60">{d.agent}</span>
                        {" · "}
                        {d.reason}
                      </p>
                      <span className="text-xs text-ivory/25 shrink-0">{d.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
