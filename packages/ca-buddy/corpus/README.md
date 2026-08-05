# CA Buddy Corpus

Add new regulatory excerpts, ICAI guidance, and CA strategy cards **without changing TypeScript code**.

## Layout

```
corpus/
  regulatory/     # IT Act, CBDT, FEMA, ICAI ethics (cite-or-refuse ground truth)
  strategies/     # CAPSTONE interpretation cards & CA planning frameworks
```

## Document format

Each file is JSON:

```json
{
  "source_meta": {
    "name": "Source title",
    "license": "public-domain | public-reference | internal | licensed",
    "type": "interpretation_card"
  },
  "chunks": [
    {
      "id": "unique-chunk-id",
      "section": "Human-readable section label",
      "text": "Chunk body — one atomic claim or strategy step",
      "keywords": ["search", "terms"],
      "topics": ["harvest", "structuring"],
      "mode": "A",
      "requires_ca_review": true
    }
  ]
}
```

## Ingest

```bash
pnpm --filter @capstone/ca-buddy corpus:ingest
```

Rebuilds the in-memory TF-IDF index from all JSON files under `regulatory/` and `strategies/`.

## Routing

Intent routing, response templates, and tool bindings live in `config/` — edit JSON there to wire new topics to calculators and templates.

## FY cockpit

```ts
import { analyzeHniFy, buildFinancialCalendar, buildPortfolioContext } from "@capstone/ca-buddy";

const portfolio = buildPortfolioContext({ family, holdings, firewall, dailyGlance });
const report = analyzeHniFy(portfolio, { financial_year: "2025-26", as_of_date: "2026-06-20" });
// report.calendar, report.decisions, report.action_cards — suggestions only
```

Ask via orchestrator: *"What should I do this financial year?"* → intent `fy_analysis`.

## Operating desk (CA analysis)

```ts
import {
  buildPortfolioContext,
  createBrainset,
  runDailyDesk,
  applyCaReview,
  applyHniApproval,
  hniClearedActionCards,
} from "@capstone/ca-buddy";

const portfolio = buildPortfolioContext({ family, holdings, firewall, dailyGlance });
const brainset = createBrainset({ family_id: "demo", portfolio, status: "demo" });
const plan = runDailyDesk(brainset);
const afterCa = applyCaReview(plan, [{ item_id: plan.items[0].id, action: "approve" }]);
const afterHni = applyHniApproval(afterCa, [{ item_id: plan.items[0].id, action: "approve" }]);
const cards = hniClearedActionCards(afterHni); // instructions only — never auto-execute
```

Ask: *"Run today's Day Plan for the CA desk"* → intent `desk_day_plan`.

## Licensing

Do not commit copyrighted CA coaching PDFs without license. Prefer public IT Act/CBDT sources and human-authored interpretation cards.
