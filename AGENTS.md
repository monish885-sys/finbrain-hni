# CAPSTONE — Agent & Developer Instructions

This repository builds **CAPSTONE**, an AI-powered wealth command layer for HNIs in India.

**Main buddy:** **Fin** (brain + operating desk). Code package: `packages/ca-buddy`.  
**Orient anytime:** [`docs/mastery.md`](docs/mastery.md).

## Source of truth (read before shipping)

**Start here:** [`docs/mastery.md`](docs/mastery.md) (visual) then [`docs/README.md`](docs/README.md).

| Priority | Document | Role |
|----------|----------|------|
| 0 | [`docs/mastery.md`](docs/mastery.md) | Visual mastery map — Fin, brainsets, desk |
| 1 | [`docs/anti-goals.md`](docs/anti-goals.md) | Non-negotiable boundaries |
| 2 | [`docs/product-bible.md`](docs/product-bible.md) | Vision, features, data model, roadmap |
| 3 | [`docs/build-plan.md`](docs/build-plan.md) | **What to build, in what order** |
| 4 | [`docs/tech-plan.md`](docs/tech-plan.md) | Stack, local vs cloud, CI, services |
| 5 | [`docs/ca-buddy.md`](docs/ca-buddy.md) | **Fin** — powers ARCHITECT + CA/desk/agents |
| 6 | [`docs/launch-checklist.md`](docs/launch-checklist.md) | Ship gates before demo/pilot/prod |

If a task conflicts with anti-goals or product-bible, **stop and do not implement**. Propose an in-lane alternative.

## Anti-Goals Gate (every PR / feature)

Before merging or demoing, confirm:

- [ ] No money movement, trade execution, lending, or product distribution  
- [ ] Fin / ARCHITECT: citations for tax claims; Action Card or "consult your CA" on complex queries  
- [ ] Desk Day Plans: CA review then HNI approval — never auto-execute  
- [ ] No sharing of financial data without consent model (Advisor Mesh)  
- [ ] No plain-text credential storage; India-only data residency assumed for production design  
- [ ] Not an ITR filing portal; not mass-market salaried-user product  
- [ ] UI copy does not imply we execute on user's behalf (instructions only)  
- [ ] Family/personal features respect consent and dignity rules  

Also run the relevant section of [`docs/launch-checklist.md`](docs/launch-checklist.md).

## Code conventions

- **Monorepo:** `apps/web` (Next.js), `packages/types`, `packages/demo-data`, `packages/ui`, `packages/ca-buddy` (**Fin**)  
- **Demo data:** Kapoor family fixtures in `packages/demo-data` — no real PII in repo  
- **Types:** Shared contracts in `packages/types`; anti-goal constants in `packages/types/src/anti-goals.ts`  
- **Fin:** Must import and honor `ARCHITECT_RULES` from anti-goals; **LLM never does tax math** — use `packages/ca-buddy` calculators  

## Key product patterns

- **Action Cards** = instructions for user to execute externally; never auto-execute  
- **Tax Firewall** = reconciliation and memos; not e-filing  
- **Fee-only** = no commission product recommendations  
- **Fin** = main buddy (brain + desk); **sub-buddies** = specialists; **brainset** = per-portfolio state; **bible** = shared rules  
- **ARCHITECT** = owner-portal chat surface that calls Fin  

## Build order (do not skip)

1. Calculators + golden evals (`packages/ca-buddy` Phase B1–B2)  
2. RAG corpus + cite-or-refuse (Phase B3)  
3. Orchestrator + live Fin via ARCHITECT (Phase B4–B5)  
4. Brainsets + operating desk (CA → HNI) — design ready before account wiring  
5. Fine-tune last (Phase B6) — only after eval ceiling  

See [`docs/build-plan.md`](docs/build-plan.md) for full track dependencies.

## Docs

| Doc | Use when |
|-----|----------|
| [`docs/mastery.md`](docs/mastery.md) | Orient on the whole project |
| [`docs/README.md`](docs/README.md) | Doc index; vibe-coding rules |
| [`docs/build-plan.md`](docs/build-plan.md) | Planning sprints |
| [`docs/tech-plan.md`](docs/tech-plan.md) | Engineering decisions |
| [`docs/ca-buddy.md`](docs/ca-buddy.md) | Fin / tax brain work |
| [`docs/ca-buddy-training.md`](docs/ca-buddy-training.md) | Before writing brain code |
| [`docs/architecture.md`](docs/architecture.md) | Demo → MVP migration |
| [`docs/launch-checklist.md`](docs/launch-checklist.md) | Before shipping |
| [`docs/demo-script.md`](docs/demo-script.md) | Investor demo |
