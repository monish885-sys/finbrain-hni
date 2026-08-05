# CAPSTONE — 8-Minute Investor Demo Script

Use this walkthrough when presenting to an HNI investor. Target: under 10 minutes, no developer assistance.

**Login:** [http://localhost:3000](http://localhost:3000) · Password: `capstone2026`

---

## 0:00 — Daily Glance (Home)

**Say:** "One screen, full family, tax radar live."

- Point to **₹800 Cr** family net worth and today's delta
- Highlight **Tax saved YTD: ₹8.7L** — ROI proof for subscription
- Show status chips: 2 Action Cards, advance tax in 18 days, firewall mismatches
- Note: **58% held-away** — their HDFC RM sees only 24%

**Transition:** "Let me show you how we see everything."

---

## 1:30 — God Mode Dashboard

**Route:** `/wealth`

**Say:** "Nobody — not your CA, not your RM, not your spouse — sees this in real time today."

- Entity breakdown: You · HUF · Spouse · Trust · Real Estate
- Asset class allocation donut
- Held-away alert banner
- Holdings table across Zerodha, HDFC, Groww, PMS, AIF
- 12-month net worth trend

**Transition:** "Now the fear every HNI has — tax notices."

---

## 3:00 — Tax-Notice Firewall

**Route:** `/firewall`

**Say:** "Notice prevention, not evasion. We reconcile what the government knows vs what your CA filed."

- Status: 841/847 matched, **6 need attention**
- Click **SBI FD ₹50L** mismatch — missing income in ledger
- Show suggested fix and AIS reference
- Click **Export to CA** — downloads reconciliation memo PDF

**Transition:** "And here's where we save real money."

---

## 4:30 — Action Cards (Harvest)

**Route:** `/actions` → open harvest card

**Say:** "₹3.2L saved with one trade instruction. We don't execute — we tell you exactly what to do."

- Open **TATASTEEL harvest** card
- Show without/after tax comparison
- Sell 400 shares on Groww, offset RELIANCE gain on HDFC
- **Export instruction** PDF for broker
- **Mark as done** persists in session

**Transition:** "Questions? Ask ARCHITECT."

---

## 6:00 — ARCHITECT

**Route:** `/architect`

**Say:** "Portfolio-aware AI. Every tax claim cites the IT Act."

- Click suggested prompt: **"Can I gift ₹50L to my HUF?"**
- Show answer with **Section 64(2)** citation
- Point to Action Card CTA
- Optional: "Do I need advance tax this quarter?"

**Transition:** "Here's what's coming next."

---

## 7:00 — Roadmap Teasers

**Routes:** `/honesty-check`, `/time-machine`

- **Honesty Check:** Manager scorecard, duplicate fund alerts (Q3 2026)
- **Time Machine:** HUF ₹2Cr Pune RE scenario — ₹10.2L tax savings (Q3 2026)
- Mention 90-day plan: live Account Aggregator, CAS parser, ARCHITECT RAG

---

## 8:00 — Close

**Say:**

> "CAPSTONE Family plan is ₹3.5L/year. You save ₹3L+ in documented tax in year 1. We don't hold your money, we don't sell products, we don't execute trades. We give you clarity, control, and action."

**If asked "Is this real data?"**

> "This is demo mode with the Kapoor family sample from our product spec. For pilot, we onboard with your CA and connect via Account Aggregator — that's week 5 of our 90-day build."

---

## Objection handling

| Question | Answer |
|----------|--------|
| Mobile app? | Responsive web now; iOS/Android beta at day 90 |
| Regulatory? | Fee-only, no execution; RIA registration path |
| Data security? | India-hosted, encrypted, no engineer access to raw data |
| vs HDFC/ICICI app? | Banks can't show competitor held-away — structural conflict |

---

## Reset demo state

Clear browser localStorage key `capstone_action_cards` to reset Action Card completion status.
