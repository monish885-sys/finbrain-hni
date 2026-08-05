# CAPSTONE Documentation — The Build Bible

**Status:** Source of truth for all product, engineering, and AI work in this repo.  
**Rule:** If code conflicts with these docs, **fix the code** or **update the docs in the same PR** — never silently drift.

**Start here for the full picture:** [`mastery.md`](mastery.md) — visual mastery map (Fin, tracks, what’s live).

---

## Read this first (mandatory order)

Every human or coding agent **must** read in this order before shipping anything:

| # | Document | Role |
|---|----------|------|
| 0 | [`mastery.md`](mastery.md) | Visual project mastery — Fin, brainsets, desk loop |
| 1 | [`anti-goals.md`](anti-goals.md) | Non-negotiable boundaries — legal, regulatory, personal |
| 2 | [`product-bible.md`](product-bible.md) | Vision, users, features, data model, business roadmap |
| 3 | [`build-plan.md`](build-plan.md) | **Master build sequence** — what to build, in what order, and when it is "done" |
| 4 | [`tech-plan.md`](tech-plan.md) | Stack, environments, services, CI, local vs cloud |
| 5 | [`ca-buddy.md`](ca-buddy.md) | **Fin** brain + operating desk — powers ARCHITECT and all Fin surfaces |
| 6 | [`AGENTS.md`](../AGENTS.md) | PR gate checklist for agents and developers |

Optional but recommended before AI/tax work:

| Document | Role |
|----------|------|
| [`ca-buddy-training.md`](ca-buddy-training.md) | Builder training syllabus + eval gates |
| [`architecture.md`](architecture.md) | Demo → MVP migration detail |
| [`launch-checklist.md`](launch-checklist.md) | Ship gates for demo, MVP, staging, production |
| [`demo-script.md`](demo-script.md) | Investor demo walkthrough |

---

## Document hierarchy

```
                    anti-goals.md  ← LAW (never violate)
                           │
                    product-bible.md  ← WHAT & WHY
                           │
                    mastery.md  ← VISUAL MAP (orient anytime)
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        build-plan.md  tech-plan.md  ca-buddy.md (Fin)
              │            │            │
              └────────────┼────────────┘
                           ▼
                  launch-checklist.md  ← WHEN safe to ship
                           │
                    architecture.md  ← HOW demo becomes prod
```

---

## Vibe-coding rules

When building fast with AI assistance, **always**:

1. **Gate first** — Run the [Anti-Goals Gate](../AGENTS.md) mentally before every feature.
2. **Follow build order** — See [`build-plan.md`](build-plan.md). Do not skip to RAG/fine-tune before calculators + evals.
3. **Use constants** — Import `ARCHITECT_RULES`, `PLATFORM_DISCLAIMER`, `ARCHITECT_FALLBACK` from `@capstone/types`.
4. **Demo data only** — Real PII never in repo. Kapoor fixtures live in `packages/demo-data`.
5. **Action Cards = instructions** — Never auto-execute, never imply we file or trade for the user. Desk plans need CA → HNI approval.
6. **LLM never does tax math** — Extract variables → deterministic calculator → narrate result.
7. **Cite or refuse** — Every tax claim needs IT Act section or CBDT circular, or refuse.
8. **Local first, cloud when needed** — See [`tech-plan.md`](tech-plan.md) § Environments.
9. **Fin is the brain** — One shared bible; per-portfolio brainsets; sub-buddies under Fin. Package: `packages/ca-buddy`.

### Before opening a PR

- [ ] Anti-Goals Gate passed ([`AGENTS.md`](../AGENTS.md))
- [ ] Relevant launch checklist section reviewed ([`launch-checklist.md`](launch-checklist.md))
- [ ] Types extended in `packages/types` if contracts changed
- [ ] No forbidden copy ("we will file", "buy this scheme", "audit-proof", "guaranteed no notice")

### Before swapping demo fixtures for live APIs

- [ ] Sprint milestone in [`build-plan.md`](build-plan.md) marked complete
- [ ] [`launch-checklist.md`](launch-checklist.md) MVP gate passed for that feature

---

## What each major doc owns

| Question | Read |
|----------|------|
| Orient me visually on the whole project | [`mastery.md`](mastery.md) |
| What is CAPSTONE and who is it for? | [`product-bible.md`](product-bible.md) §1–2 |
| What must we never build? | [`anti-goals.md`](anti-goals.md) |
| What do I build this week? | [`build-plan.md`](build-plan.md) |
| NestJS vs local Docker vs AWS? | [`tech-plan.md`](tech-plan.md) |
| How does Fin / ARCHITECT work? | [`ca-buddy.md`](ca-buddy.md) |
| What must builders learn before tax code? | [`ca-buddy-training.md`](ca-buddy-training.md) |
| Can we ship to pilots / production? | [`launch-checklist.md`](launch-checklist.md) |
| How does demo JSON become live AA? | [`architecture.md`](architecture.md) |

---

## Repo map (target state)

```
HNI/
├── apps/
│   ├── web/                 # Next.js — exists (demo UI)
│   ├── api/                 # NestJS gateway + services — Sprint 1+
│   └── mobile/              # React Native — Sprint 3+
├── packages/
│   ├── types/               # Shared contracts + anti-goals constants
│   ├── demo-data/           # Kapoor family fixtures (never real PII)
│   ├── ui/                  # Design system
│   └── ca-buddy/            # Fin: calculators, RAG, orchestrator, desk seeds
├── docs/                    # ← YOU ARE HERE (start with mastery.md)
└── infra/                   # Terraform, Docker Compose — Sprint 1+
```

---

## Machine-readable rules

Code constants mirror docs — keep in sync:

| Constant | File |
|----------|------|
| `CARDINAL_NEVERS`, `ARCHITECT_RULES`, `PLATFORM_DISCLAIMER` | [`packages/types/src/anti-goals.ts`](../packages/types/src/anti-goals.ts) |

---

## Updating these docs

When you change product scope, architecture, or brain behavior:

1. Update the **canonical doc** first (usually `build-plan.md`, `tech-plan.md`, or `ca-buddy.md`).
2. Refresh [`mastery.md`](mastery.md) if naming, desk loop, or track status changed.
3. Update cross-links in `AGENTS.md`, `README.md`, and `.cursor/rules/capstone-foundation.mdc`.
4. If anti-goals change, update **both** `docs/anti-goals.md` and `packages/types/src/anti-goals.ts`.

*Last updated: July 2026 — Fin named as main buddy; mastery map added.*
