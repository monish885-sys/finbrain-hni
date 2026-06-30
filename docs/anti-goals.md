# CAPSTONE Anti-Goals Constitution

**Status:** Non-negotiable foundation — overrides feature ideas, sprint scope, and AI behavior  
**Hierarchy:** Equal to [`product-bible.md`](product-bible.md). If a feature conflicts with either document, it does not ship.  
**Version:** 1.0 · June 30, 2026

---

## How to use this document

Every product decision, line of code, ARCHITECT prompt, integration, and partnership must pass the **Anti-Goals Gate**:

1. Does it violate any **Never** rule below?
2. Does it stay within Bible §1 (what CAPSTONE is / is not)?
3. If ambiguous, default to **no** and escalate to founders.

Agents and engineers: see root [`AGENTS.md`](../AGENTS.md) and `.cursor/rules/capstone-foundation.mdc`.

---

## 1. Financial Execution & Transactions — The "Hands-Off" Rule

CAPSTONE is an **observation and orchestration layer**, not an execution layer. This avoids heavy banking, brokerage, and NBFC licensing.

| Never | Why |
|-------|-----|
| Hold customer money | We sit above banks and brokers; capital never flows through us |
| Execute trades or move money | AI and system generate **instructions** (Action Cards); the user executes via their own broker or bank |
| Facilitate lending | Lending is explicitly out of product scope — no loans, credit lines, or NBFC-style products |
| Act as payment intermediary | No UPI collection, escrow, pooling, or settlement on behalf of users |
| Auto-execute Action Cards | Even with broker API access in future, execution remains user-initiated and off-platform |
| Custody or safekeeping of securities | No demat, no pooled accounts, no nominee-of-record on our books |

**Allowed:** Action Cards with step-by-step instructions, deep links to broker apps, export memos for CA/bank.

---

## 2. Advisory & Conflict of Interest — The "Neutral Copilot" Rule

Our moat is **absolute neutrality**. We avoid the conflicts that plague traditional wealth managers.

| Never | Why |
|-------|-----|
| Sell financial products for commission | Business model is **fee-only**; revenue must align with user outcomes |
| Recommend specific products for kickbacks | ARCHITECT must not push AMC schemes, insurance, or PMS for referral fees |
| Provide binding legal advice | We complement lawyers and CAs; we do not replace them |
| Invent tax rules | Every tax claim or simulation must cite **IT Act section** or **CBDT circular** — or refuse |
| Guarantee tax outcomes or audit immunity | Simulations are estimates; no "you will not get a notice" promises |
| Act as SEBI RIA without registration | Register as fee-only RIA or partner with a registered RIA before regulated advice |
| Facilitate tax evasion or illegal structuring | Optimization within law only; refuse requests to hide income or misreport |
| Claim fiduciary status without being one | Be precise about role: orchestration copilot, not trustee or executor |
| Rank or shame managers without evidence + disclaimer | Honesty Check uses data and benchmarks; always surface methodology and limits |

**Required AI behavior (ARCHITECT):**

- End complex tax/legal queries with an **Action Card** or explicit **"consult your CA / lawyer"** warning
- Cite sources inline; refuse uncited tax positions
- Log conversations for audit (Bible §11)

---

## 3. Data Privacy & Security — The Zero-Trust Mandate

Family wealth graphs are among the most sensitive data in India. Paranoia is the default.

| Never | Why |
|-------|-----|
| Share data without explicit consent | Banks, RMs, CAs, and family members get **permissioned** access only via Advisor Mesh |
| Store credentials in plain text | IT portal passwords and auth secrets: encrypted at rest or not stored (prefer OAuth/session tokens) |
| Allow routine human access to raw financial data | Engineers operate on anonymized fixtures; production PII access is break-glass only |
| Host data offshore | Data residency: **India only** (e.g. AWS `ap-south-1`) per DPDP and user trust |
| Use customer data for model training without opt-in | Default: no training on user portfolios; explicit consent required |
| Collect Aadhaar or excess PII | Data minimization — only what integrations require |
| Retain deleted user data beyond legal minimum | Right to erasure honored; vault exports are user-controlled |
| Expose one family member's holdings to another without consent | Spouse/successor views are permissioned, not automatic surveillance |

---

## 4. Scope & Feature Boundaries — Staying in Your Lane

| Never | Why |
|-------|-----|
| Become an ITR filing portal | Firewall + reconciliation memos yes; e-filing and Form submission no |
| Target the mass market | Not for salaried employees with simple finances — HNI entity webs only (Bible §2) |
| Act as mutual fund distributor or bank app | Command layer, not captive financial institution |
| Replace the CA on contested positions | We prepare drafts and flags; user + CA sign off on filings |
| Build generic net-worth tracking for ₹50L savers | Compete on complexity (HUF, trust, held-away), not on FOLO/CRED use cases |
| White-label to partners who violate these anti-goals | Enterprise/API channel must contractually inherit this constitution |

**Explicitly NOT in MVP** (Bible §15): trade execution, product distribution, lending, full IT portal API without consent framework.

---

## 5. Legal & Regulatory — The "License You Don't Need" Rule

Stay on the right side of RBI, SEBI, ITD, and DPDP without over-reaching.

| Never | Why |
|-------|-----|
| Operate as NBFC, payment aggregator, or broker without license | Observation layer only |
| Provide investment advice outside RIA framework | Fee-only subscription + documented RIA path (Bible §12) |
| Store wills/trust deeds unencrypted | Document vault: client-side encryption option for sensitive legal docs |
| Impersonate ITD, SEBI, or bank communications | No phishing-adjacent UX; official notices are user-uploaded or API-sourced with attribution |
| Bypass AA consent framework | All FIP data via Account Aggregator consent artifacts — no credential scraping |
| Make representations in marketing that trigger SEBI ad norms without review | "Guaranteed returns" and performance claims are forbidden |

---

## 6. Personal, Family & Human — The "Dignity & Consent" Rule

Wealth software touches marriage, inheritance, illness, and death. Handle with care.

| Never | Why |
|-------|-----|
| Surveil family members without consent | Children, spouse, parents — each access grant is explicit |
| Trigger "If I'm Gone" vault without defined succession rules | Emergency access only per user-configured triggers (Bible Phase 2) |
| Create family conflict by exposing hidden accounts | Aggregation is for the **principal's** control, not weaponized transparency |
| Shame or judge financial decisions | Neutral copilot tone — clarity, not moralizing |
| Optimize for engagement over user welfare | No dark patterns, streaks, or fear-based nudges to drive logins |
| Pressure users into harvests or trades for platform metrics | Action Cards are suggestions; dismiss is always valid |
| Expose minor children's detailed wealth without guardian consent | Minors: guardian-controlled visibility only |
| Conflate mental health, grief, or crisis with financial advice | Redirect to professionals; do not advise during stated crisis without human escalation |
| Replace human judgment on irreversible life events | Relocation, divorce, death, succession — simulate and defer to CA/lawyer |

---

## 7. Engineering & Operations — The "Build What We Claim" Rule

| Never | Why |
|-------|-----|
| Ship features that imply execution (e.g. "Buy now" that places orders) | UI copy and APIs must reinforce hands-off model |
| Log PAN, holdings, or IT credentials to third-party analytics | No Mixpanel-style raw financial telemetry |
| Use production data in dev/staging | Fixtures only (`packages/demo-data`) unless formal anonymization pipeline |
| Disable audit logs for financial reads/writes | Every access logged with timestamp + actor (Bible §12) |
| Soften anti-goals for demo convenience | Demo mode still shows disclaimers and Action Card pattern — no fake execution |

---

## Quick reference — The 12 Cardinal Nevers

1. Never hold customer money  
2. Never execute trades or move money  
3. Never facilitate lending  
4. Never sell products for commission  
5. Never invent tax rules — cite or refuse  
6. Never share data without consent  
7. Never store secrets in plain text  
8. Never host data outside India  
9. Never file ITR or act as e-filing portal  
10. Never target mass-market simple savers  
11. Never provide binding legal advice  
12. Never surveil family without permission  

---

## Related documents

| Document | Role |
|----------|------|
| [`product-bible.md`](product-bible.md) | Product vision, features, architecture, roadmap |
| [`architecture.md`](architecture.md) | Technical map; must respect anti-goals in service boundaries |
| [`packages/types/src/anti-goals.ts`](../packages/types/src/anti-goals.ts) | Machine-readable rules for ARCHITECT prompts and UI disclaimers |
| [`AGENTS.md`](../AGENTS.md) | Agent/developer gate before shipping work |

*When in doubt: observation, orchestration, neutrality, consent, India residency, consult your CA.*
