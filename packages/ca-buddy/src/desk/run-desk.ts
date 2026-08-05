import { PLATFORM_DISCLAIMER } from "@capstone/types";
import type {
  Brainset,
  CaReviewPack,
  DayPlan,
  DayPlanItem,
  RagCitation,
  ToolTrace,
} from "@capstone/types";
import {
  compareTaxRegime,
  computeAdvanceTax,
  pairHarvestLots,
} from "../calculators";
import { getBuddyConfig } from "../config/loader";
import { resolveAsOfDate, resolveFinancialYear } from "../extraction/variables";
import { retrieveCitations } from "../rag/retrieve";

function hashInputs(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url").slice(0, 16);
}

function daysUntil(due: string, asOf: string): number {
  const ms = new Date(due).getTime() - new Date(asOf).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Proactive CA-style daily desk: portfolio signals → Day Plan proposals.
 * Never executes. Items that need CA land in awaiting_ca; routine items can go to HNI after CA batch.
 */
export function runDailyDesk(brainset: Brainset, asOfDate?: string): DayPlan {
  const asOf = asOfDate ?? resolveAsOfDate(brainset.portfolio);
  const fy = resolveFinancialYear({
    ...brainset.portfolio,
    tax_signals: { ...brainset.portfolio.tax_signals, as_of_date: asOf },
  });
  const portfolio = brainset.portfolio;
  const defaults = getBuddyConfig().runtime.defaults;
  const now = new Date().toISOString();
  const items: DayPlanItem[] = [];
  const toolTraces: ToolTrace[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `dpi-${prefix}-${++seq}`;

  const projected =
    portfolio.tax_signals?.projected_total_tax_inr ??
    portfolio.tax_signals?.advance_tax_amount_inr ??
    defaults.projected_tax_inr;

  const advanceInput = {
    financial_year: fy,
    projected_total_tax_inr: projected,
    tds_credited_inr: portfolio.tax_signals?.tds_credited_inr ?? 0,
    advance_tax_paid_inr: portfolio.tax_signals?.advance_tax_paid_inr ?? 0,
    as_of_date: asOf,
  };
  const advance = computeAdvanceTax(advanceInput);
  toolTraces.push({
    tool: "computeAdvanceTax",
    inputs_hash: hashInputs(advanceInput),
    output: advance,
  });

  if (advance.advance_tax_required && advance.instalment_due_inr > 0) {
    items.push({
      id: nextId("at"),
      category: "advance_tax",
      priority: "high",
      title: `Pay Q${advance.current_quarter} advance tax`,
      details: `Instalment due ₹${advance.instalment_due_inr.toLocaleString("en-IN")} by ${advance.due_by}. Pay via challan ITNS 280 externally.`,
      rationale: `Net liability ₹${advance.net_liability_inr.toLocaleString("en-IN")}; 234C risk ₹${advance.interest_234c_inr.toLocaleString("en-IN")}.`,
      sub_buddy: "statutory_tax",
      escalate_to_ca: false,
      status: "proposed",
      required_citations: ["Section 208", "Section 234C"],
      action_card: {
        type: "advance_tax",
        title: `Pay Q${advance.current_quarter} advance tax`,
        subtitle: "Instalment due — pay via challan ITNS 280",
        details: `Due ₹${advance.instalment_due_inr.toLocaleString("en-IN")} by ${advance.due_by}`,
        savings_inr: advance.interest_234c_inr,
        deadline: advance.due_by,
      },
    });
  }

  if (portfolio.open_mismatches > 0) {
    const critical = portfolio.firewall_status === "critical";
    items.push({
      id: nextId("fw"),
      category: "firewall",
      priority: critical ? "high" : "medium",
      title: `Reconcile ${portfolio.open_mismatches} Tax Firewall item(s)`,
      details: `AIS/ledger mismatches: ${portfolio.open_mismatches}. Treat as reconciliation flags — not evasion. Gather CAS / 26AS / broker P&L.`,
      rationale: `Firewall status: ${portfolio.firewall_status}.`,
      sub_buddy: "accounting",
      escalate_to_ca: critical,
      status: "proposed",
      required_citations: ["AIS"],
      action_card: {
        type: "firewall_fix",
        title: "Resolve Tax Firewall mismatches",
        subtitle: `${portfolio.open_mismatches} open item(s) — instruction-only`,
        details: `Status: ${portfolio.firewall_status}`,
      },
    });
  }

  if ((portfolio.harvest_lots?.length ?? 0) > 0) {
    const harvest = pairHarvestLots(portfolio.harvest_lots!);
    toolTraces.push({
      tool: "pairHarvestLots",
      inputs_hash: hashInputs(portfolio.harvest_lots),
      output: harvest,
    });
    if (harvest.pairs.length > 0) {
      items.push({
        id: nextId("hv"),
        category: "harvest",
        priority: "medium",
        title: `Review ${harvest.pairs.length} harvest pair(s)`,
        details: `Estimated tax save ₹${harvest.total_tax_saved_inr.toLocaleString("en-IN")}. Execute sells on your broker — instructions only.`,
        rationale: `Unpaired losses ₹${harvest.unpaired_losses_inr.toLocaleString("en-IN")}; unpaired gains ₹${harvest.unpaired_gains_inr.toLocaleString("en-IN")}.`,
        sub_buddy: "wealth",
        escalate_to_ca: false,
        status: "proposed",
        required_citations: ["Section 111A"],
        action_card: {
          type: "harvest",
          title: "Execute harvest offset (instructions only)",
          subtitle: "Sell loss lots to offset gains on your broker",
          details: `${harvest.pairs.length} pair(s)`,
          savings_inr: harvest.total_tax_saved_inr,
        },
      });
    }
  }

  if ((portfolio.nominee_gaps ?? 0) > 0) {
    items.push({
      id: nextId("nm"),
      category: "nominee",
      priority: "medium",
      title: `Close ${portfolio.nominee_gaps} nominee gap(s)`,
      details: "Update nominees across demat, bank, insurance, and entity holdings — instruction-only.",
      rationale: "Nominee hygiene reduces succession friction.",
      sub_buddy: "risk",
      escalate_to_ca: false,
      status: "proposed",
      required_citations: [],
      action_card: {
        type: "nominee_fix",
        title: "Fix nominee gaps",
        subtitle: "Update nominees across accounts — instructions only",
        details: `${portfolio.nominee_gaps} gap(s)`,
      },
    });
  }

  const upcoming = brainset.calendar
    .filter((e) => {
      const d = daysUntil(e.due_date, asOf);
      return d >= 0 && d <= 45;
    })
    .slice(0, 5);

  for (const event of upcoming) {
    items.push({
      id: nextId("cal"),
      category: "calendar",
      priority: event.priority,
      title: event.title,
      details: `${event.details} Due ${event.due_date}.`,
      rationale: "Within 45-day operating window for this brainset calendar.",
      sub_buddy: "calendar",
      escalate_to_ca: event.escalate_to_ca,
      status: "proposed",
      required_citations: [],
    });
  }

  if (portfolio.entity_count >= 3) {
    items.push({
      id: nextId("ent"),
      category: "structuring",
      priority: "low",
      title: "Entity-web hygiene review",
      details: `${portfolio.entity_count} entities in web — review MCA filings, related-party flows, and FEMA flags with CA.`,
      rationale: "Multi-entity webs need periodic Mode B review; Fin does not restructure.",
      sub_buddy: "corporate_fema",
      escalate_to_ca: true,
      status: "proposed",
      required_citations: ["Section 47"],
      action_card: {
        type: "structuring",
        title: "Entity-web CA review",
        subtitle: "Checklist only — no execution",
        details: portfolio.entities_summary.join("; "),
      },
    });
  }

  const gross =
    portfolio.estimated_gross_income_inr ??
    Math.round(portfolio.total_net_worth_inr * defaults.gross_income_factor_of_networth);
  const regimeInput = {
    financial_year: fy,
    gross_income_inr: gross,
    old_regime_deductions_inr:
      portfolio.old_regime_deductions_inr ?? defaults.old_regime_deductions_inr,
  };
  const regime = compareTaxRegime(regimeInput);
  toolTraces.push({
    tool: "compareTaxRegime",
    inputs_hash: hashInputs(regimeInput),
    output: regime,
  });
  if (regime.savings_inr > 50_000) {
    items.push({
      id: nextId("rg"),
      category: "portfolio",
      priority: "low",
      title: `Regime check: ${regime.recommended} may save ₹${regime.savings_inr.toLocaleString("en-IN")}`,
      details: "Compare old vs new regime with full deductions before AY lock-in. Suggestion only.",
      rationale: "Material savings threshold crossed on estimated income.",
      sub_buddy: "statutory_tax",
      escalate_to_ca: true,
      status: "proposed",
      required_citations: [],
    });
  }

  const citations: RagCitation[] = [
    ...retrieveCitations("advance tax Section 208 Section 234C", { topics: ["advance_tax"] }),
    ...retrieveCitations("AIS firewall mismatch", { topics: ["firewall"] }),
    ...retrieveCitations("harvest Section 111A", { topics: ["harvest"] }),
  ];
  const uniqueCitations = [...new Map(citations.map((c) => [c.chunk_id, c])).values()].slice(0, 6);

  const needsCa = items.some((i) => i.escalate_to_ca);
  const planId = `dp-${brainset.id}-${asOf.replace(/-/g, "")}`;

  return {
    id: planId,
    brainset_id: brainset.id,
    as_of_date: asOf,
    financial_year: fy,
    status: needsCa || items.length > 0 ? "awaiting_ca" : "closed",
    summary: [
      `Day Plan for **${brainset.family_name}** as of ${asOf} (FY ${fy}).`,
      `${items.length} proposal(s) from Fin sub-buddies.`,
      needsCa
        ? "CA review required before HNI sees escalate items."
        : "Routine proposals ready for CA batch then HNI approval.",
      "Instructions only — Fin never files, trades, or moves money.",
    ].join(" "),
    items,
    citations: uniqueCitations,
    tool_traces: toolTraces,
    created_at: now,
    updated_at: now,
  };
}

export function buildCaReviewPack(brainset: Brainset, plan: DayPlan): CaReviewPack {
  const awaiting = plan.items.filter(
    (i) => i.status === "proposed" || i.escalate_to_ca,
  );
  return {
    day_plan_id: plan.id,
    brainset_id: brainset.id,
    family_name: brainset.family_name,
    as_of_date: plan.as_of_date,
    items_awaiting_ca: awaiting.filter((i) =>
      ["proposed", "ca_edited"].includes(i.status) || i.escalate_to_ca,
    ),
    summary: `${awaiting.length} item(s) for CA review on Day Plan ${plan.id}. Approve, edit, or reject — then HNI can clear Action Cards.`,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

export function formatDayPlanAnswer(plan: DayPlan, pack?: CaReviewPack): string {
  const lines = plan.items
    .slice(0, 8)
    .map((i) => {
      const flag = i.escalate_to_ca ? " _(CA)_" : "";
      return `• **[${i.priority}] ${i.title}**${flag}\n  ${i.details}`;
    })
    .join("\n");

  const cites = plan.citations
    .slice(0, 4)
    .map((c) => `**${c.section}:** ${c.text}`)
    .join("\n");

  return `${plan.summary}

**Proposed tasks (not executed):**
${lines || "• No open desk items for this brainset today."}

**Desk status:** ${plan.status}
${pack ? `\n**CA pack:** ${pack.summary}` : ""}

${cites}

${PLATFORM_DISCLAIMER}

Approval chain: Fin proposes → CA reviews → HNI approves → Action Card (external execution only).`;
}
