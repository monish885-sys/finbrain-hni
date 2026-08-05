# CAPSTONE Launch Checklists

**Status:** Ship gates — do not demo, pilot, or production-launch without checking the relevant section.  
**Companion:** [`build-plan.md`](build-plan.md) (milestones), [`anti-goals.md`](anti-goals.md) (law)

---

## How to use

1. Find your **launch type** below.  
2. Every checkbox must be **true** or explicitly deferred with doc update.  
3. Coding agents: paste checklist status in PR description when claiming "ready to ship."

---

## Universal Anti-Goals Gate (every PR, every launch)

From [`AGENTS.md`](../AGENTS.md):

- [ ] No money movement, trade execution, lending, or product distribution  
- [ ] Fin / ARCHITECT: citations for tax claims; Action Card or "consult your CA" on complex queries
- [ ] Desk Day Plans (when enabled): CA review then HNI approval — never auto-execute  
- [ ] No sharing of financial data without consent model (Advisor Mesh)  
- [ ] No plain-text credential storage; India-only data residency for production design  
- [ ] Not an ITR filing portal; not mass-market salaried-user product  
- [ ] UI copy does not imply we execute on user's behalf (instructions only)  
- [ ] Family/personal features respect consent and dignity rules  
- [ ] `PLATFORM_DISCLAIMER` visible on ARCHITECT and exports  
- [ ] No real PII in git (PAN, AIS PDFs, bank statements)

---

## L0 — Investor demo (current state)

**Audience:** Investors, founders, design partners. **Data:** Kapoor fixtures only.

### Product

- [ ] All portal routes render without errors (`/portals` → owner/family/CA/RM/successor)
- [ ] God Mode, Firewall, Actions, ARCHITECT, Daily Glance show seeded data
- [ ] Action Cards persist done/dismissed in localStorage
- [ ] PDF export works on Action Card detail
- [ ] Demo login gate works (`capstone2026`)
- [ ] Honesty Check + Time Machine marked as Phase 2 teasers

### AI / ARCHITECT

- [ ] Seeded responses from `architect-responses.json` only
- [ ] Citations displayed in UI when present in fixture
- [ ] `ARCHITECT_FALLBACK` shown for unknown prompts
- [ ] No live LLM API keys required for demo

### Legal / copy

- [ ] Demo disclaimer on login or footer
- [ ] No copy implying execution, filing, or product sales

### Deploy

- [ ] `pnpm build` succeeds
- [ ] Deployed to Vercel (or documented local-only demo)

**Sign-off:** Founder demo using [`demo-script.md`](demo-script.md).

---

## L1 — Fin foundation brain

**When:** End of build Track B Phase B0–B2. **Environment:** Local + CI.

### Docs

- [ ] [`docs/README.md`](README.md) doc index complete
- [ ] [`ca-buddy.md`](ca-buddy.md) + [`ca-buddy-training.md`](ca-buddy-training.md) reviewed
- [ ] [`build-plan.md`](build-plan.md) + [`tech-plan.md`](tech-plan.md) aligned

### Code

- [ ] `packages/ca-buddy` exists with P0 calculators
- [ ] Calculator unit tests: 100% pass on P0 functions
- [ ] Types for Fin contracts in `packages/types`
- [ ] CI runs `test` + `eval:deterministic` on every PR

### Evals

- [ ] ≥20 golden scenarios in `packages/ca-buddy/evals/golden/`
- [ ] ≥90% pass on deterministic eval subset
- [ ] Forbidden phrase scan: 0 violations
- [ ] ≥3 refuse scenarios (evasion, file-for-me, product push) pass

**Sign-off:** No ARCHITECT live LLM swap until L1 complete.

---

## L2 — MVP Sprint 1 (Foundation — Day 30)

**When:** Track A Phase A1 complete. **Environment:** Local API + Docker PG; optional staging.

### Backend

- [ ] `apps/api` NestJS skeleton deployed or runnable locally
- [ ] OAuth2/OIDC auth working
- [ ] PostgreSQL migrations: Family, Person, LegalEntity, Asset
- [ ] `GET /health` + `GET /family/networth` operational

### Integrations

- [ ] AA consent flow implemented (TSP sandbox or pilot)
- [x] Client onboarding wizard (`/register` → profile → AA/CAS/manual → complete) — simulated TSP until keys configured (`TSP_PROVIDER` / `TSP_API_KEY` / `TSP_BASE_URL`)
- [x] Broker OAuth connectors (Upstox / Zerodha) — redirect login + encrypted tokens + 6h sync when `UPSTOX_*` / `KITE_*` env set
- [ ] At least one test user: bank + MF + demat ingested
- [ ] Demo fixtures preserved in `packages/demo-data`

### Frontend

- [x] Owner God Mode reads from API when `USE_LIVE_API=true` (or equivalent flag)
- [x] Authenticated live clients do **not** fall back to Kapoor fixtures (empty state instead)
- [ ] Demo mode still uses fixtures for investor pitch

### Security

- [ ] No secrets in git
- [ ] Auth required on all non-public API routes

**Sign-off:** One real AA-connected family in dev/staging.

---

## L3 — MVP Sprint 2 (Tax core — Day 60)

**When:** Track A Phase A2 complete.

### Tax engine

- [ ] CAS import (Zerodha + Groww minimum)
- [ ] STCG/LTCG uses `packages/ca-buddy` calculators
- [ ] Tax ledger persisted per FY
- [ ] Firewall v1: AIS upload → diff → mismatch list
- [ ] Harvest scan generates server-side Action Cards

### UI

- [ ] Firewall + Actions pages use API (not static JSON) in live mode
- [ ] Action Card instructions remain instruction-only

### Testing

- [ ] Calculator integration tests with sample CAS/AIS fixtures
- [ ] L1 eval harness still green

**Sign-off:** End-to-end harvest Action Card from real/simulated lot data.

---

## L4 — MVP launch (Day 90 — 10 pilot families)

**When:** Track A Phase A3 + Track B Phase B4–B5 minimum.

### ARCHITECT live

- [x] `POST /ai/ask` on local (staging/production AWS remaining)
- [x] Fin orchestrator with portfolio brainset context (`portfolio=live`)
- [x] Operating desk path: Day Plan → CA → HNI (`/ai/desk/*`)
- [x] ARCHITECT UI calls API; fixtures fallback only
- [x] Every tax answer: citations OR refuse (eval harness)
- [x] Complex queries: Action Card OR consult-CA
- [x] Conversation audit log enabled (`ConversationAudit`)

### Product complete (MVP scope)

- [x] Advance tax projection live (`POST /tax/advance-tax`)
- [x] Nominee audit (manual entry) + audit endpoint (weekly job stub documented)
- [ ] Mobile beta (read-only) — **deferred**; Track A code complete without RN app
- [ ] 10 pilot families — **ops gate** (not blocked on code)

### Infra

- [ ] AWS `ap-south-1` staging + production defined — **needs AWS credentials**
- [ ] Encryption at rest (KMS) on production DB and S3
- [ ] Secrets in Secrets Manager

### Evals

- [x] Deterministic golden eval 100% + stress suite green (local/CI)
- [ ] Full LLM golden eval ≥85% on staging — **needs `CA_BUDDY_LLM_API_KEY`**
- [x] Red-team subset run — no critical failures (`eval:stress`)

### Pilots

- [ ] 10 pilot families onboarded with consent
- [ ] CA partner review of sample ARCHITECT + Action Card outputs
- [ ] Incident response contact documented

### Explicitly NOT required for L4

- ITR e-filing
- HUF/trust full automation
- Trade execution
- Product distribution

**Sign-off:** Founder + CA advisor review of 5 live ARCHITECT transcripts.

---

## L5 — Staging environment gate

**When:** Before any pilot uses live ARCHITECT or real AIS.

- [ ] All services in `ap-south-1` only
- [ ] pgvector corpus indexed on staging
- [ ] Nightly `golden-eval-llm` job configured
- [ ] Corpus ingest: staging review before prod promotion
- [ ] No production PII in staging logs
- [ ] Rollback procedure documented

---

## L6 — Production launch (post-MVP)

**When:** After L4 stable for ≥4 weeks.

### Scale & reliability

- [ ] Multi-AZ RDS (or equivalent)
- [ ] Backup and restore tested
- [ ] Rate limiting on `/ai/ask`
- [ ] Monitoring + alerting on API and jobs

### Compliance

- [ ] DPDP-aligned privacy policy published
- [ ] Data retention and erasure process documented
- [ ] Model training on customer data: default OFF, opt-in documented

### Business

- [ ] Fee-only pricing live (no commission products)
- [ ] CA advisor channel agreements if applicable
- [ ] RIA registration path documented if giving regulated advice

**Sign-off:** Founder production go/no-go.

---

## L7 — Fin senior brain (Phase B6)

**When:** Months 6–18; optional fine-tune only after L4 stable.

- [ ] Case law corpus indexed with review workflow
- [ ] FEMA / trust sub-minds pass expanded golden set
- [ ] Red-team suite runs weekly — green
- [ ] Fine-tune (if any): still tool + RAG forced; eval regression none
- [ ] Human CA sample review of Mode B memos

---

## Forbidden launch blockers (instant no-ship)

If any are true, **do not launch**:

- ARCHITECT returns tax numbers without calculator tool trace  
- Tax claims without citations in production ARCHITECT  
- UI or AI copy promises filing, execution, or audit immunity  
- Real customer AIS/PAN in public repo or logs  
- Production data outside India  
- Auto-execution of Action Cards  

---

## PR template snippet (copy into description)

```markdown
## Launch checklist
- [ ] Universal Anti-Goals Gate
- [ ] Relevant section: L___ (circle one)

## Brain / ARCHITECT (if applicable)
- [ ] Golden scenario added/updated
- [ ] Calculators used for numbers
- [ ] Citations or refuse
- [ ] CI eval green
```

*Checklists are gates, not bureaucracy — they keep vibe coding from shipping anti-goals.*
