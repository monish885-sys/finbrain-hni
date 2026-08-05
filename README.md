# CAPSTONE HNI — Investor Demo

AI-powered wealth command layer for High Net-worth Individuals in India.

> Your bank sees their book. Your CA sees last year. **CAPSTONE sees everything.**

## Quick start

```bash
pnpm install
pnpm dev          # Next.js on :3000 (ARCHITECT → Fin via /api/ai/ask)
pnpm dev:api      # Nest API on :4000 (optional; set CAPSTONE_API_URL)
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `capstone2026`

## What's included

This is a **2-week investor demo** with seeded data for the Kapoor family (₹800 Cr net worth):

| Screen | Route | Feature |
|--------|-------|---------|
| Portal picker | `/portals` | Choose Owner · Family · Investor · CA · RM · Successor |
| Daily Glance | `/owner/dashboard` | 30-second wealth summary (per portal) |
| God Mode | `/owner/wealth` | Family net worth, entities, holdings |
| Tax Firewall | `/owner/firewall` | AIS reconciliation, mismatch alerts |
| Action Cards | `/owner/actions` | Tax harvest & compliance inbox |
| ARCHITECT | `/owner/architect` | Chat surface for **Fin** (live via BFF; demo JSON fallback) |
| Honesty Check | `/owner/honesty-check` | Phase 2 teaser |
| Time Machine | `/owner/time-machine` | Phase 2 teaser |

Legacy routes (`/dashboard`, etc.) redirect to `/owner/*`.

## Monorepo structure

```
HNI/
├── apps/web/           # Next.js 15 demo app
├── apps/api/           # NestJS — /health + /ai/ask (Fin)
├── packages/
│   ├── ca-buddy/       # Fin — main buddy brain
│   ├── demo-data/      # Kapoor family JSON fixtures
│   ├── types/          # Shared TypeScript types
│   └── ui/             # Design system & INR formatting
└── docs/               # Start with mastery.md
```
## Documentation — Build Bible

**Orient anytime:** [`docs/mastery.md`](docs/mastery.md)  
**Doc index:** [`docs/README.md`](docs/README.md)

| Document | Role |
|----------|------|
| [`docs/mastery.md`](docs/mastery.md) | **Visual mastery map** — Fin, brainsets, desk, tracks |
| [`docs/anti-goals.md`](docs/anti-goals.md) | **Law** — non-negotiable boundaries |
| [`docs/product-bible.md`](docs/product-bible.md) | Vision, features, roadmap |
| [`docs/build-plan.md`](docs/build-plan.md) | Master build sequence (product + Fin + infra) |
| [`docs/tech-plan.md`](docs/tech-plan.md) | Stack, local vs cloud, CI, services |
| [`docs/ca-buddy.md`](docs/ca-buddy.md) | **Fin** — brain + operating desk |
| [`docs/ca-buddy-training.md`](docs/ca-buddy-training.md) | Training syllabus before brain code |
| [`docs/launch-checklist.md`](docs/launch-checklist.md) | Ship gates (demo → MVP → prod) |
| [`docs/architecture.md`](docs/architecture.md) | Demo → 90-day MVP migration |

Everything built in this repo must pass the Anti-Goals Gate (see [`AGENTS.md`](AGENTS.md)).

## Deploy

```bash
pnpm build
# Deploy apps/web to Vercel (root: apps/web)
```

## Post-demo roadmap

See [`docs/build-plan.md`](docs/build-plan.md) for the full execution plan and [`docs/architecture.md`](docs/architecture.md) for demo → MVP migration detail.

## Disclaimer

Demo mode only. No real financial data. CAPSTONE does not execute trades or hold customer money.
