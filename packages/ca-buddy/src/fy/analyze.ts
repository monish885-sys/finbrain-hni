import { PLATFORM_DISCLAIMER } from "@capstone/types";
import type {
  FyReport,
  PortfolioContext,
  ToolTrace,
} from "@capstone/types";
import { buildFinancialCalendar } from "../calendar/build-calendar";
import {
  compareTaxRegime,
  computeAdvanceTax,
  computeStcgLtcg,
  pairHarvestLots,
} from "../calculators";
import { getBuddyConfig } from "../config/loader";
import { resolveAsOfDate, resolveFinancialYear } from "../extraction/variables";
import { retrieveCitations } from "../rag/retrieve";
import { planFyDecisions } from "./decision-planner";

export interface AnalyzeHniFyOptions {
  financial_year?: string;
  as_of_date?: string;
  nominee_gaps?: number;
}

function hashInputs(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url").slice(0, 16);
}

/**
 * CA-quality FY suggestion cockpit for HNI entity webs.
 * Returns calendar, decisions, and instruction-only Action Cards.
 * Never executes; contested items escalate to CA.
 */
export function analyzeHniFy(
  portfolio: PortfolioContext,
  options: AnalyzeHniFyOptions = {},
): FyReport {
  const asOf = options.as_of_date ?? resolveAsOfDate(portfolio);
  const fy = options.financial_year ?? resolveFinancialYear({
    ...portfolio,
    tax_signals: { ...portfolio.tax_signals, as_of_date: asOf, financial_year: options.financial_year },
  });

  const toolTraces: ToolTrace[] = [];
  const defaults = getBuddyConfig().runtime.defaults;

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
  const advanceTax = computeAdvanceTax(advanceInput);
  toolTraces.push({
    tool: "computeAdvanceTax",
    inputs_hash: hashInputs(advanceInput),
    output: advanceTax,
  });

  const gross =
    portfolio.estimated_gross_income_inr ??
    Math.round(portfolio.total_net_worth_inr * defaults.gross_income_factor_of_networth);
  const regimeInput = {
    financial_year: fy,
    gross_income_inr: gross,
    old_regime_deductions_inr:
      portfolio.old_regime_deductions_inr ?? defaults.old_regime_deductions_inr,
  };
  const regimeCompare = compareTaxRegime(regimeInput);
  toolTraces.push({
    tool: "compareTaxRegime",
    inputs_hash: hashInputs(regimeInput),
    output: regimeCompare,
  });

  let harvest;
  if ((portfolio.harvest_lots?.length ?? 0) > 0) {
    harvest = pairHarvestLots(portfolio.harvest_lots!);
    toolTraces.push({
      tool: "pairHarvestLots",
      inputs_hash: hashInputs(portfolio.harvest_lots),
      output: harvest,
    });
  }

  const propertyCg = (portfolio.property_assets ?? []).map((p) => {
    const input = {
      asset_class: "property" as const,
      sale_value_inr: p.value_inr,
      cost_inr: p.cost_inr,
      purchase_date: p.purchase_date ?? "2020-01-01",
      sale_date: asOf,
    };
    const output = computeStcgLtcg(input);
    toolTraces.push({
      tool: "computeStcgLtcg",
      inputs_hash: hashInputs(input),
      output,
    });
    return output;
  });

  const taxMath = {
    advance_tax: advanceTax,
    regime_compare: regimeCompare,
    harvest,
    property_cg: propertyCg.length ? propertyCg : undefined,
  };

  const calendar = buildFinancialCalendar(portfolio, {
    financial_year: fy,
    as_of_date: asOf,
    nominee_gaps: options.nominee_gaps ?? portfolio.nominee_gaps,
    has_company: portfolio.entities_summary.some((e) => /pvt_ltd/i.test(e)),
  });

  const { decisions, actionCards, escalate_to_ca } = planFyDecisions({
    portfolio,
    taxMath,
    calendar,
  });

  const citations = [
    ...retrieveCitations("advance tax Section 208 Section 234C", { topics: ["advance_tax"] }),
    ...retrieveCitations("AIS firewall mismatch reconcile", { topics: ["firewall", "reconciliation"] }),
    ...retrieveCitations("harvest STCG Section 111A", { topics: ["harvest", "capital_gains"] }),
    ...retrieveCitations("HUF gift clubbing Section 64", { topics: ["huf", "structuring"] }),
  ];
  const uniqueCitations = [...new Map(citations.map((c) => [c.chunk_id, c])).values()].slice(0, 8);

  const entityViews = portfolio.entities_summary.map((line) => {
    const match = line.match(/^(.+)\s+\((.+)\)$/);
    return {
      name: match?.[1] ?? line,
      type_hint: match?.[2] ?? "entity",
      note: "Include in FY entity-web review — suggestion only; consult your CA for filings.",
    };
  });

  const summary = [
    `FY ${fy} suggestion cockpit for **${portfolio.family_name}** (as of ${asOf}).`,
    `Net worth context ₹${(portfolio.total_net_worth_inr / 10_000_000).toFixed(2)} Cr across ${portfolio.entity_count} entities.`,
    `Calendar: ${calendar.length} dated items; ${decisions.length} ranked decisions; ${actionCards.length} instruction-only Action Cards.`,
    escalate_to_ca
      ? "Some items require CA review before action."
      : "Routine items can proceed as self-executed instructions after your review.",
  ].join(" ");

  return {
    financial_year: fy,
    as_of_date: asOf,
    family_name: portfolio.family_name,
    summary,
    entity_views: entityViews,
    tax_math: taxMath,
    calendar,
    decisions,
    action_cards: actionCards,
    citations: uniqueCitations,
    tool_traces: toolTraces,
    escalate_to_ca,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

export function formatFyReportAnswer(report: FyReport): string {
  const topDecisions = report.decisions
    .slice(0, 5)
    .map((d) => `• **${d.topic}:** ${d.recommendation}${d.escalate_to_ca ? " _(consult CA)_" : ""}`)
    .join("\n");
  const nextEvents = report.calendar
    .slice(0, 6)
    .map((e) => `• ${e.due_date} — ${e.title}`)
    .join("\n");
  const cites = report.citations
    .slice(0, 4)
    .map((c) => `**${c.section}:** ${c.text}`)
    .join("\n");

  return `${report.summary}

**Priority decisions (suggestions only):**
${topDecisions || "• No decisions generated — provide more portfolio tax signals."}

**Upcoming calendar:**
${nextEvents || "• No calendar events."}

${cites}

${report.disclaimer}

This is a planning memo for you and your CA — CAPSTONE does not file, execute trades, or replace professional sign-off.`;
}
