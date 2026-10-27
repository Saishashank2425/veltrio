# Veltrio

**A policy-first trust layer for AI-initiated commerce.** A shopping agent can research and propose a purchase, but Veltrio checks the proposal before checkout. The demo gateway returns `ALLOW`, `BLOCK`, or `ESCALATE`; an allowed proposal can continue to a PayPal **sandbox** order.

> **Prototype boundary:** never use production payment credentials. PayPal checkout is sandbox-only and requires server-side credentials. Product search requires a Channel3 key (preferred) or optional SerpApi fallback. Gemini-assisted mandate extraction requires a Gemini API key. Saved mandates, the audit log, and spend counters are not durable, and saved mandates are not yet wired into the gateway policy. This is not a production financial product.

## Product flow

1. **Discover:** use Agent Hub and product search to find real product listings.
2. **Describe policy:** draft spending limits and merchant restrictions from natural language. Gemini 2.5 Flash is used when configured; otherwise the deterministic parser is used.
3. **Authorize:** submit a structured proposal to the deterministic gateway. The gateway does not use an LLM for its final decision.
4. **Checkout:** only an `ALLOW` proposal can create a PayPal sandbox order. `BLOCK` and `ESCALATE` stop before an order is created.
5. **Capture:** after the sandbox buyer approves, Veltrio asks PayPal to capture the order and records demo spend only when PayPal confirms a completed capture.

## Live product search — Channel3

Veltrio prefers Channel3, a hackathon sponsor, for structured cross-retailer product data. SerpApi remains an optional fallback.

1. Sign up at https://trychannel3.com/developers and create a Channel3 API key. Hackathon participants can use the sponsor's free credits described on the [Channel3 Devpost resource page](https://paypalaihackathon.devpost.com/details/channel3).
2. In Render, open the Veltrio service and add `CHANNEL3_API_KEY`.
3. Redeploy. The server calls `POST https://api.trychannel3.com/v1/search`; the key stays server-side.
4. If you prefer the existing Google Shopping integration, configure `SERPAPI_API_KEY` instead. Channel3 takes precedence if both are configured.

Prices, stock, images, and retailer offers may change. Budget filters currently include only listings with a parseable INR price at or below the budget. The app links to retailer offers; it does not purchase items directly from those merchants.

## PayPal sandbox checkout

The checkout page at `/checkout` demonstrates the required policy-before-payment flow with PayPal's sandbox Orders API. It does not use real money.

1. Open the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and create a sandbox REST app.
2. Add these **server-side** environment variables to the Render service:
   - `PAYPAL_CLIENT_ID` — sandbox app client ID.
   - `PAYPAL_CLIENT_SECRET` — sandbox app secret.
   - `NEXT_PUBLIC_APP_URL` — optional; set to `https://veltrio-u9tu.onrender.com` for explicit return/cancel URLs.
3. Never use live credentials and never expose the secret with a `NEXT_PUBLIC_` prefix. Redeploy after saving variables.
4. Use a PayPal **sandbox personal/buyer** account to approve the test order. Sandbox credentials are separate from ordinary PayPal login credentials.
5. Try all four included scenarios: an allowed Staples purchase, an unlisted vendor (blocked), a subscription (escalated), and a purchase that exceeds the example category budget.

The server checks the proposal before creating an order. Only `ALLOW` can reach PayPal. Demo spend is recorded after a confirmed capture. The sample rules are hard-coded demo policy; user-created mandate drafts are not yet connected to them. There is no production payment, refund, webhook, authentication, or durable audit integration.

## AI-assisted mandate extraction

1. Create a Gemini API key in Google AI Studio.
2. Add `GEMINI_API_KEY` to Render as a server-side environment variable and redeploy.
3. The mandate parser calls Gemini 2.5 Flash for structured extraction, then validates and normalizes its fields. If the key is absent or the model call fails, the deterministic parser is used.
4. Always review the extracted draft. Neither parser authorizes purchases or activates the mandate.

The deterministic gateway remains separate from the AI layer: no model call participates in `ALLOW`, `BLOCK`, or `ESCALATE`.

## Product surfaces

- `/` — overview and directory for every workspace.
- `/agents` — local-browser agent workspace prototype.
- `/shop` — product search using Channel3 or optional SerpApi.
- `/mandates` — natural-language mandate draft and review; saved in browser local storage.
- `/demo` — deterministic gateway policy demo and in-memory audit trace.
- `/checkout` — policy-gated PayPal sandbox order creation and capture.
- `/finance` — manual, browser-local finance organizer; no bank connection.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4, Framer Motion, Lucide, PayPal Orders API (sandbox), Channel3 product search API (optional key), Gemini 2.5 Flash (optional key), and Render hosting.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Provider keys are optional for local startup; provider-backed features display setup guidance until their server-side keys are configured.

## Verify

```bash
npm run test:gateway
npx tsc --noEmit
npm run build
npm run test:e2e
```

## Authorization policy (demo)

1. **R001 — Vendor allowlist:** vendors not on the approved list are blocked.
2. **R002 — Subscription policy:** subscriptions require human review.
3. **R003 — Transaction limit:** a transaction over $500 is blocked.
4. **R004 — Category budget:** proposals exceeding a category budget are escalated; proposals exceeding 110% of the limit are blocked.
5. **R005 — High-value transaction:** proposals at or above $1,000 are escalated.

Rules are deterministic. `BLOCK` wins over `ESCALATE`. The sandbox checkout asks the authorization layer not to increment spend on order creation; spend is recorded only after a confirmed PayPal capture.

## API

- `POST /api/authorize` — evaluate a proposal; returns HTTP 200 for ALLOW, 202 for ESCALATE, 403 for BLOCK, and 400/422 for malformed input.
- `GET /api/authorize` — retrieve the last 50 in-memory decisions.
- `GET /api/rules` — inspect active sample policy and spend counters.
- `POST /api/reset` — reset demo counters and clear the in-memory audit log.
- `GET /api/products?q=...` — search Channel3 or SerpApi.
- `POST /api/paypal/create-order` — evaluate policy and create a PayPal sandbox order only for ALLOW.
- `POST /api/paypal/capture-order` — verify and capture an approved sandbox order.
- `POST /api/mandates/parse` — Gemini-assisted extraction when configured, deterministic fallback otherwise.

## Hackathon resources used

- [PayPal AI Hackathon resources](https://paypalaihackathon.devpost.com/resources/)
- [PayPal Checkout integration](https://developer.paypal.com/platforms/checkout/standard/integrate)
- [PayPal sandbox dashboard](https://developer.paypal.com/dashboard/)
- [Channel3 sponsor page](https://paypalaihackathon.devpost.com/details/channel3)
- [Channel3 developer portal](https://trychannel3.com/developers)
- [PayPal AI Toolkit](https://github.com/paypal/AI-Toolkit)
- [Render sponsor page](https://paypalaihackathon.devpost.com/details/render)

## Limitations before production

The demo has no user authentication, saved mandate enforcement, durable audit store, idempotent webhook handling, refund flow, production payment support, bank connection, or real merchant checkout. State may reset on restart or differ across instances. Never submit sensitive financial information or production credentials. Review PayPal, Channel3, Gemini, and hosting terms before public production use.
