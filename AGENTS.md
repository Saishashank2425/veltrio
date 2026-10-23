<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Veltrio — Agent Context

**Next.js 16.4.2 · Tailwind v4 (CSS-first) · TypeScript · Framer Motion 14 · Lucide React**

### Critical conventions

| Rule | Detail |
|---|---|
| Tailwind v4 | **No `tailwind.config.ts`**. All tokens in `app/globals.css` under `@theme inline { }`. Use `--color-*` prefix → `bg-navy`, `text-gold`, etc. |
| Framer Motion ease | Use `const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]` — never a plain `number[]` (fails TS). |
| Framer variants | Avoid function-form `visible: (i) => {...}` — use inline `transition` props per element. |
| Authorization | All gateway logic lives in `lib/gateway.ts`. Route handlers are thin wrappers only. |
| Fail-closed | Default outcome is BLOCK. Never grant authorization by default. |
| No fabrication | No fake stats, testimonials, security badges, or working PayPal credentials. |

### File map

```
app/page.tsx               Landing page
app/demo/page.tsx          Interactive demo (3 tabs)
app/api/authorize/route.ts POST authorize · GET audit log
app/api/rules/route.ts     GET active policy
lib/gateway.ts             Authorization engine (single source of truth)
lib/utils.ts               cn() helper
components/layout/         Navbar, Footer
components/sections/       Hero, ProblemBridge, HowItWorks, SpendingControl, TrustSection, CallToAction
components/ui/             Button, Badge, SectionLabel, StepCard, RuleCard
```

### Design tokens (globals.css)

```
navy       #0D1B2A    (bg default)
navy-deep  #081320
navy-mid   #162438
ivory      #F5F0E8    (text default)
gold       #C9A84C    (accent)
approved   #2D7A4F
blocked    #9B2C2C
pending    #B7791F
```

### Dev commands

```bash
npm run dev     # http://localhost:3000 (or 3001 if port taken)
npm run build   # production build — must exit 0 before merging
npx tsc --noEmit  # type check
```
