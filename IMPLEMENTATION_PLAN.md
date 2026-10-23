# Veltrio — Implementation Plan

> **Status:** In execution · Last updated: 2026-10-23

## Product Overview

Veltrio is a deterministic AI authorization gateway for a hackathon demo. An AI agent proposes a purchase; the gateway evaluates it against user-defined spending rules; the result (ALLOW / BLOCK / ESCALATE) is returned with a full audit trail. No AI model is consulted during authorization — every decision is deterministic.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.2 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first, `@theme` tokens) |
| Animation | Framer Motion 14 |
| Icons | Lucide React |
| Font | Inter (via next/font/google) |
| Deployment | Vercel (via `vercel.json`) |

---

## Architecture

```
app/
├── page.tsx                  ← Landing page (static)
├── layout.tsx                ← Root layout (Inter font, metadata)
├── globals.css               ← Tailwind v4 tokens + base styles
├── not-found.tsx             ← Custom 404
├── demo/
│   ├── layout.tsx            ← Demo-specific metadata
│   └── page.tsx              ← Interactive demo (3 tabs)
└── api/
    ├── authorize/route.ts    ← POST authorize + GET audit log
    └── rules/route.ts        ← GET active policy

lib/
├── gateway.ts                ← Shared authorization engine (single source)
└── utils.ts                  ← cn() helper

components/
├── layout/
│   ├── Navbar.tsx            ← Sticky nav with mobile menu
│   └── Footer.tsx
└── sections/
    ├── Hero.tsx              ← Headline + SVG gateway diagram
    ├── ProblemBridge.tsx     ← Editorial copy section
    ├── HowItWorks.tsx        ← 3-step workflow
    ├── SpendingControl.tsx   ← Rule list + decision feed mockup
    ├── TrustSection.tsx      ← 4 principle cards
    └── CallToAction.tsx      ← Final CTA
    ui/
    ├── Button.tsx            ← primary / secondary / ghost
    ├── Badge.tsx             ← approved / blocked / pending / neutral
    ├── SectionLabel.tsx      ← Overline label
    ├── StepCard.tsx          ← Workflow step
    └── RuleCard.tsx          ← Spending rule display
```

---

## Authorization Rules (lib/gateway.ts)

| Rule | Type | Outcome |
|---|---|---|
| R001 Vendor Allowlist | Allowlist check | BLOCK if not listed |
| R002 Subscription Policy | Flag check | ESCALATE always |
| R003 Per-Vendor Tx Limit | Threshold ($500) | BLOCK if exceeded |
| R004 Category Monthly Budget | Rolling budget | ESCALATE or BLOCK |
| R005 High-Value Escalation | Threshold ($1,000) | ESCALATE if ≥ |

**Fail-closed:** BLOCK terminates evaluation immediately. ESCALATE continues (a later BLOCK overrides it).

---

## Milestones

- [x] M1 — Scaffold, design tokens, shared UI atoms
- [x] M2 — Hero section with SVG gateway diagram
- [x] M3 — Problem Bridge + How It Works
- [x] M4 — Spending Control preview
- [x] M5 — Trust Section + Final CTA
- [x] M6 — Polish, reduced-motion, mobile nav, 404, build verification
- [x] P1 — Working authorization API (POST + GET)
- [x] P2 — Demo with 3 tabs: Sandbox, Audit Log, Policy
- [x] P2 — 8 preset scenarios including 2 adversarial
- [x] P2 — GET /api/rules endpoint
- [ ] P3 — End-to-end test script
- [ ] P3 — PayPal sandbox (scope: not applicable for this demo)

---

## Verified Test Results

| Scenario | Expected | Actual | HTTP |
|---|---|---|---|
| Office supplies, Staples, $64 | ALLOW | ✅ ALLOW | 200 |
| Unknown vendor (CryptoVendorXX), $4999 | BLOCK | ✅ BLOCK (R001) | 403 |
| Delta Airlines, $750 (over limit) | BLOCK | ✅ BLOCK (R003) | 403 |
| Zoom Pro subscription, known vendor | ESCALATE | ✅ ESCALATE (R002) | 202 |
| Marriott, $800 (over travel budget) | ESCALATE | ✅ ESCALATE (R004) | 202 |
| Adversarial: urgent wire transfer | BLOCK | ✅ BLOCK (R001) | 403 |

---

## Deployment

```bash
# Local dev
npm install
npm run dev         # http://localhost:3000

# Production build verification
npm run build

# Vercel
vercel deploy       # uses vercel.json
```
