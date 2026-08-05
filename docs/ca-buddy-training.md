# Fin — Training & Prerequisites Syllabus

**Status:** Required learning path for anyone building **Fin** (`packages/ca-buddy`) or ARCHITECT.  
**Parent doc:** [`ca-buddy.md`](ca-buddy.md) · Visual: [`mastery.md`](mastery.md)  
**Build gates:** [`build-plan.md`](build-plan.md) Track B

---

## Purpose

Before writing tax logic, RAG ingest, or orchestrator code, builders must understand:

1. **What CAPSTONE is and is not** (anti-goals)  
2. **How Fin thinks like a CA** (judgment + citation + escalation + desk loop)  
3. **Which tax/domain slices CAPSTONE actually uses** (not full ICAI Final syllabus)  
4. **How the three-tier brain works** (LLM / RAG / calculators)  
5. **Bible vs brainset** — one shared constitution; per-portfolio state  

Completion is proven by **golden scenarios** (written test cases), not by reading alone.

---

## Gate 0 — Constitution (required before any brain code)

**Read (full):**

- [`docs/mastery.md`](mastery.md)  
- [`docs/anti-goals.md`](anti-goals.md)  
- [`docs/product-bible.md`](product-bible.md) §0, §1–2, §11  
- [`docs/ca-buddy.md`](ca-buddy.md) § Anti-goals + Hard rules + Operating desk  
- [`packages/types/src/anti-goals.ts`](../packages/types/src/anti-goals.ts)

**Internalize:**

| Concept | One-line test |
|---------|---------------|
| Hands-off | Can you explain why Action Cards never auto-execute? |
| Neutral | Why don't we recommend "HDFC Tax Saver Fund"? |
| Cite or refuse | What happens if RAG returns no IT Act chunk? |
| Scope | Why is ₹20L salaried ITR filing out of scope? |
| Privacy | Why is real AIS never committed to git? |

**Prove:** Write 3 **refuse scenarios** (evasion, "file for me", product push) with expected ARCHITECT response shape.

**Exit:** Mentor or self-check against [`launch-checklist.md`](launch-checklist.md) § Brain Gate B0.

---

## Gate 1 — Builder domain syllabus (compressed ICAI-informed)

Study blocks in order. Depth = enough to write calculator specs and golden evals, not to sit for CA Final.

### T1 — Tax core (Mode A foundation)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| Old vs new tax regime | Regime compare calculator | Write 2 golden cases with expected `compareTaxRegime` I/O |
| Slabs, surcharge, cess | `calculateTaxSlab` | Unit test edge cases: ₹50L, ₹1Cr, ₹2Cr income |
| Advance tax + 234B/C | Advance tax Action Cards | Golden case: Q1 due with projected gains |
| TDS / 26AS basics | Firewall reconciliation | Map 26AS TDS line → ledger account |

### T2 — Capital gains (Harvest + Time Machine)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| STCG/LTCG equity (111A, 112A) | Harvest engine | Golden: Kapoor demat lot harvest |
| STCG/LTCG debt, property | Broader CG calc | Calculator stub inputs/outputs doc |
| Section 54 / 54F / 54EC | Time Machine, Mode B | Golden: property sale + reinvestment — **consult CA ending** |
| Indexation (where applicable) | Debt/property LTCG | FY-versioned index table in code constants |

### T3 — Information systems (Tax Firewall mind)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| AIS, TIS, 26AS | Firewall diff engine | List 5 mismatch types → Action Card type |
| Notice pathway | Risk sub-mind | Explain mismatch → notice without implying evasion |
| Form 26AS vs broker P&L | Reconciliation | Golden: AIS CG ≠ CAS total |

### T4 — Entity & clubbing (Mode B routing)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| Person vs HUF vs trust vs company | Entity graph | Draw Kapoor family entity diagram from `family.json` |
| Section 64 clubbing | Gift to HUF query | Golden: "gift ₹50L to HUF" with s.64 citation |
| Section 47 transfers (conceptual) | Restructuring memos | When to escalate to CA vs answer |

### T5 — Trusts & succession (Phase B6 depth)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| Discretionary family trust (conceptual) | Mode B memos | Outline memo sections — no binding advice |
| Estate vs tax | If I'm Gone + ARCHITECT | Consent and dignity rules from anti-goals |

### T6 — FEMA lite (Corporate sub-mind)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| Residential status | NRI transition prompts | Golden: "moving to Singapore" checklist |
| LRS limits (conceptual) | Flags only | Escalate to CA for execution |
| NRI gift/reporting | Risk flags | Refuse execution; Action Card |

### T7 — Ethics (Layer 0)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| Independence, objectivity | ARCHITECT tone | No product push; no guarantee language |
| Complement don't replace | consult-CA endings | Every complex golden case ends correctly |

### T8 — Case interpretation (RAG Phase B3+)

| Topic | CAPSTONE use | Study artifact |
|-------|--------------|----------------|
| ITAT/HC/SC patterns | When law is ambiguous | 2 examples: cite case **or** refuse |
| Principle vs fact | Orchestrator | Same section, different facts → different escalate flag |

**Gate 1 exit:** Complete golden scenario drafts for T1–T4 (minimum 12 scenarios). Review against [`ca-buddy.md`](ca-buddy.md) hard rules.

---

## Gate 2 — Calculator discipline (pairs with build Phase B1)

**Rule:** The LLM extracts variables; calculators return numbers.

**Practice:**

1. For each golden scenario needing numbers, define:
   - `required_tools: ["compareTaxRegime"]`
   - Exact input JSON
   - Expected output JSON (rounded rules documented)
2. Write unit tests **before** orchestrator calls the tool.
3. Verify LLM prompt templates **never** ask the model to compute tax.

**Exit:** P0 calculators in `packages/ca-buddy` with 100% unit test pass on covered functions.

---

## Gate 3 — Citation discipline (pairs with build Phase B3)

**Rule:** Every legal claim traces to a corpus chunk ID.

**Practice:**

1. For each golden scenario needing law, define:
   - `required_citation_patterns: ["Section 112A", "Circular ..."]`
2. Add matching chunks to corpus with stable IDs.
3. Test: remove chunk from index → response must refuse or escalate.

**Exit:** RAG retrieve returns citations on ≥90% of law-heavy golden cases in staging eval.

---

## Gate 4 — Orchestrator discipline (pairs with build Phase B4)

**Practice:**

1. Tag each golden scenario with `mode`, `sub_minds`, `expect_action_card`, `expect_escalate_ca`.
2. Run routing tests without LLM (rule-based classifier first).
3. Add LLM classifier only after deterministic routing baseline passes.

**Exit:** Mode A/B and sub-mind tags correct on ≥90% of golden set.

---

## Gate 5 — Portfolio context (pairs with build Phase B5)

**Practice:**

1. Load Kapoor `family.json` + `holdings.json` + `firewall.json` as context pack.
2. Golden scenarios must reference **specific** portfolio facts ("your HDFC FD", not generic advice).
3. Verify audit log stores query + response metadata — not full PAN/statements.

**Exit:** ARCHITECT answers on staging use live context slice; no fixture mismatch in eval.

---

## Gate 6 — Deep mind (optional; months 6–18)

Only after Gates 1–5 plateau:

- Expand corpus: ITAT headnotes, FEMA regs, Companies Act restructuring  
- Optional domain fine-tune on ICAI materials + annotated Q&A  
- **Still** tool-forced for math, RAG-forced for citations  
- Red-team: adversarial prompts weekly  

**Exit:** Red-team suite green; Mode B multi-law memos pass human CA review sample.

---

## Knowledge sources (what goes into the brain)

| Source | Training use | Customer data? |
|--------|--------------|----------------|
| Anti-goals + Bible + ARCHITECT_RULES | Constitution prompts | No |
| Human golden Q&A | Eval + behavior | No |
| IT Act / CBDT curated slices | RAG | No |
| ICAI ethics excerpts | RAG + prompts | No |
| Calculator unit tests | Numeric truth | No |
| Kapoor demo fixtures | Context tests | Demo only |
| Case law headnotes | RAG Phase B6 | No |
| Live circulars | Staging → prod index | No |
| Real user portfolios | **Never train** | Opt-in only for prod inference context |

---

## Refuse taxonomy (memorize)

| User intent | Brain response |
|-------------|----------------|
| Hide income / evasion | Refuse; no alternatives that evade |
| "File my ITR" | Refuse; offer reconciliation memo + consult CA |
| "Buy this mutual fund" | Refuse product; offer asset-class / tax character view |
| "Guarantee no notice" | Refuse; explain Firewall limits |
| Contested legal position | Cite what you can + escalate CA |
| Uncited / low RAG confidence | `ARCHITECT_FALLBACK` |
| Out of scope (mass-market salaried) | Refuse; explain HNI lane |

---

## Weekly training rhythm (recommended for solo builder)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Gate 0 + T1 | 3 refuse scenarios + 2 regime golden cases |
| 2 | T2 + T3 | 4 CG + Firewall golden cases |
| 3 | B1 calculators | Unit tests for slab + regime + CG |
| 4 | T4 + B2 eval harness | 12+ scenarios in CI |
| 5–6 | T7 + B3 RAG | Corpus v0 + cite tests |
| 7–8 | B4 orchestrator | Routing + staging ARCHITECT |
| 9+ | B5 context | Pilot-ready ARCHITECT |

---

## Checklist before you vibe-code brain features

- [ ] Gate 0 read complete  
- [ ] Task maps to current phase in [`build-plan.md`](build-plan.md)  
- [ ] Golden scenario exists or will be added in same PR  
- [ ] Numbers go through calculator, not LLM  
- [ ] Legal claims have citation path or refuse  
- [ ] No forbidden phrases in prompts or UI  
- [ ] Demo data only in repo  

*Training is not optional decoration — it is how the brain stays legal, citeable, and shippable.*
