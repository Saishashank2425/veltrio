# Veltrio

**A deterministic authorization layer for AI-initiated purchases.** Agents can propose actions, but they do not decide whether money should be spent. Veltrio evaluates every proposal against explicit policy rules and returns `ALLOW`, `BLOCK`, or `ESCALATE` with an audit trace.

> **Demo safety:** the app currently uses in-memory sample data. It does not execute real payments, connect to bank accounts, or persist audit logs. Provider integrations are not enabled unless explicitly configured and verified.

## Product surfaces

- **Landing page:** product overview, policy flow and security principles.
- **Gateway demo:** submit purchase proposals, inspect decisions and rule traces, view audit history, inspect policy, and reset demo state.
- **Agent Hub:** a local-browser workspace prototype. Tool states are illustrative and do not prove a provider integration is live.
- **Finance dashboard:** a browser-local finance prototype. Data is not synchronized with banks or financial institutions.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4, Framer Motion and Lucide.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Verify

```bash
npm run test:gateway
npx tsc --noEmit
npm run build
```

GitHub Actions runs gateway tests, TypeScript checks and a production build for pushes to `main`, the polish branch and pull requests targeting `main`.

## Authorization policy

1. **R001 — Vendor allowlist:** vendors not on the approved list are blocked.
2. **R002 — Subscription policy:** subscriptions require human review.
3. **R003 — Transaction limit:** a transaction over $500 is blocked.
4. **R004 — Category budget:** proposals exceeding a category budget are escalated; proposals exceeding 110% of the limit are blocked.
5. **R005 — High-value transaction:** proposals at or above $1,000 are escalated.

Rules run deterministically. A `BLOCK` always wins; an earlier `ESCALATE` cannot override a later `BLOCK`. Only `ALLOW` decisions update the demo spend counter. No model call participates in authorization.

## API

- `POST /api/authorize`: evaluate a proposal; returns HTTP 200 for ALLOW, 202 for ESCALATE, 403 for BLOCK, and 400/422 for malformed input.
- `GET /api/authorize`: retrieve the last 50 in-memory decisions.
- `GET /api/rules`: inspect active policy and sample spend counters.
- `POST /api/reset`: reset demo counters and clear the in-memory audit log.

## Limitations before production

State resets on restart and may differ across server instances. Routes have no authentication, audit history is not durable, and there is no payment-provider integration. Do not submit sensitive financial information or production credentials. This prototype is not production-ready for financial use.

## Deployment

Use a Node.js host that supports Next.js. Set install command to `npm ci`, build command to `npm run build`, and start command to `npm run start`. Configure secrets only through the host's environment-variable manager; the current demo requires no payment credentials.
