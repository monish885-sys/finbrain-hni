# CAPSTONE — Agent & Developer Instructions

This repository builds **CAPSTONE**, an AI-powered wealth command layer for HNIs in India.

## Source of truth (read before shipping)

1. **[`docs/product-bible.md`](docs/product-bible.md)** — vision, features, data model, roadmap  
2. **[`docs/anti-goals.md`](docs/anti-goals.md)** — non-negotiable boundaries (legal, personal, regulatory)

If a task conflicts with either document, **stop and do not implement**. Propose an alternative that stays in lane.

## Anti-Goals Gate (every PR / feature)

Before merging or demoing, confirm:

- [ ] No money movement, trade execution, lending, or product distribution  
- [ ] ARCHITECT / AI: citations for tax claims; Action Card or "consult your CA" on complex queries  
- [ ] No sharing of financial data without consent model (Advisor Mesh)  
- [ ] No plain-text credential storage; India-only data residency assumed for production design  
- [ ] Not an ITR filing portal; not mass-market salaried-user product  
- [ ] UI copy does not imply we execute on user's behalf (instructions only)  
- [ ] Family/personal features respect consent and dignity rules  

## Code conventions

- **Monorepo:** `apps/web` (Next.js), `packages/types`, `packages/demo-data`, `packages/ui`  
- **Demo data:** Rahul family fixtures in `packages/demo-data` — no real PII in repo  
- **Types:** Shared contracts in `packages/types`; anti-goal constants in `packages/types/src/anti-goals.ts`  
- **ARCHITECT:** Must import and honor `ARCHITECT_RULES` from anti-goals when building AI service  

## Key product patterns

- **Action Cards** = instructions for user to execute externally; never auto-execute  
- **Tax Firewall** = reconciliation and memos; not e-filing  
- **Fee-only** = no commission product recommendations  

## Docs

- Architecture: [`docs/architecture.md`](docs/architecture.md)  
- Demo script: [`docs/demo-script.md`](docs/demo-script.md)  
