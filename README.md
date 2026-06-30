# CAPSTONE HNI — Investor Demo

AI-powered wealth command layer for High Net-worth Individuals in India.

> Your bank sees their book. Your CA sees last year. **CAPSTONE sees everything.**

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `capstone2026`

## What's included

This is a **2-week investor demo** with seeded data for the Rahul family (₹42.3 Cr net worth):

| Screen | Route | Feature |
|--------|-------|---------|
| Portal picker | `/portals` | Choose Owner · Family · Investor · CA · RM · Successor |
| Daily Glance | `/owner/dashboard` | 30-second wealth summary (per portal) |
| God Mode | `/owner/wealth` | Family net worth, entities, holdings |
| Tax Firewall | `/owner/firewall` | AIS reconciliation, mismatch alerts |
| Action Cards | `/owner/actions` | Tax harvest & compliance inbox |
| ARCHITECT | `/owner/architect` | AI copilot with citations |
| Honesty Check | `/owner/honesty-check` | Phase 2 teaser |
| Time Machine | `/owner/time-machine` | Phase 2 teaser |

Legacy routes (`/dashboard`, etc.) redirect to `/owner/*`.

## Monorepo structure

```
HNI/
├── apps/web/           # Next.js 15 demo app
├── packages/
│   ├── demo-data/      # Rahul family JSON fixtures
│   ├── types/          # Shared TypeScript types
│   └── ui/             # Design system & INR formatting
└── docs/               # Demo script, architecture, Bible link
```

## Product Bible & Anti-Goals

| Document | Role |
|----------|------|
| [`docs/product-bible.md`](docs/product-bible.md) | Vision, features, architecture, roadmap |
| [`docs/anti-goals.md`](docs/anti-goals.md) | **Non-negotiable boundaries** — legal, personal, regulatory |

Everything built in this repo must pass the Anti-Goals Gate (see [`AGENTS.md`](AGENTS.md)).

## Deploy

```bash
pnpm build
# Deploy apps/web to Vercel (root: apps/web)
```

## Post-demo roadmap

See [`docs/architecture.md`](docs/architecture.md) for the 90-day path from demo fixtures to live AA/tax engine.

## Disclaimer

Demo mode only. No real financial data. CAPSTONE does not execute trades or hold customer money.
