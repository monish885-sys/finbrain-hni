import type { IntentCategory, RagCitation, ToolTrace } from "@capstone/types";
import type { PortfolioContext } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";
import { resolveFinancialYear } from "../extraction/variables";
import { retrieveStrategyBullets } from "../rag/retrieve";
import { formatCitations, formatInr, renderTemplate } from "./template-engine";

interface SynthInput {
  query: string;
  intent: IntentCategory;
  citations: RagCitation[];
  toolTraces: ToolTrace[];
  portfolio?: PortfolioContext;
  responseTemplate?: string;
  corpusTopics?: string[];
}

export function synthesizeAnswer(input: SynthInput): string {
  const { intent, citations, toolTraces, portfolio, responseTemplate, corpusTopics } = input;
  const { responseTemplates, runtime } = getBuddyConfig();
  const citeBlock = formatCitations(citations);
  const strategyBullets = retrieveStrategyBullets(input.query, corpusTopics).join("\n");

  const templateKey = responseTemplate ?? intent;
  const template = responseTemplates[templateKey];

  if (intent === "advance_tax" && toolTraces[0]) {
    const t = toolTraces[0].output as Record<string, number | string>;
    return renderTemplate(responseTemplates.advance_tax, {
      financial_year: resolveFinancialYear(portfolio),
      current_quarter: t.current_quarter as number,
      instalment_due_inr: formatInr(t.instalment_due_inr as number),
      due_by: t.due_by as string,
      net_liability_inr: formatInr(t.net_liability_inr as number),
      interest_234c_inr: formatInr(t.interest_234c_inr as number),
      citations: citeBlock,
    });
  }

  if (intent === "harvest" && toolTraces[0]) {
    const t = toolTraces[0].output as {
      total_tax_saved_inr: number;
      pairs: Array<{ loss_lot_id: string; gain_lot_id: string; offset_inr: number }>;
    };
    const pairSummary = t.pairs
      .map((p) => `• Offset ₹${formatInr(p.offset_inr)}: ${p.loss_lot_id} → ${p.gain_lot_id}`)
      .join("\n");
    return renderTemplate(responseTemplates.harvest, {
      pair_summary: pairSummary,
      total_tax_saved_inr: formatInr(t.total_tax_saved_inr),
      citations: citeBlock,
    });
  }

  if (intent === "capital_gains" && toolTraces[0]) {
    const t = toolTraces[0].output as Record<string, string | number>;
    return renderTemplate(responseTemplates.capital_gains_property, {
      gain_type: String(t.gain_type).toUpperCase(),
      gain_inr: formatInr(t.gain_inr as number),
      tax_inr: formatInr(t.tax_inr as number),
      section: t.section as string,
      exemption_options: runtime.exemption_options.join("\n"),
      citations: citeBlock,
    });
  }

  if (intent === "regime_compare" && toolTraces[0]) {
    const t = toolTraces[0].output as {
      recommended: string;
      savings_inr: number;
      old_regime: { total_tax_inr: number };
      new_regime: { total_tax_inr: number };
    };
    return renderTemplate(responseTemplates.regime_compare, {
      old_regime_tax: formatInr(t.old_regime.total_tax_inr),
      new_regime_tax: formatInr(t.new_regime.total_tax_inr),
      recommended: t.recommended,
      savings_inr: formatInr(t.savings_inr),
    });
  }

  if (intent === "tax_calculation") {
    const slabTrace = toolTraces.find((t) => t.tool === "calculateTaxSlab");
    if (slabTrace) {
      const t = slabTrace.output as Record<string, string | number>;
      return renderTemplate(responseTemplates.tax_slab, {
        financial_year: t.financial_year,
        regime: t.regime,
        taxable_income_inr: formatInr(t.taxable_income_inr as number),
        base_tax_inr: formatInr(t.base_tax_inr as number),
        surcharge_inr: formatInr(t.surcharge_inr as number),
        cess_inr: formatInr(t.cess_inr as number),
        total_tax_inr: formatInr(t.total_tax_inr as number),
        effective_rate_pct: t.effective_rate_pct,
      });
    }
  }

  if (intent === "section_54f") {
    const f54 = toolTraces.find((t) => t.tool === "computeSection54F");
    const summary = f54
      ? (() => {
          const t = f54.output as {
            eligible: boolean;
            exempt_amount_inr: number;
            taxable_ltcg_inr: number;
            requires_ca_review: boolean;
            notes: string[];
          };
          return [
            `• Eligible: ${t.eligible ? "likely (subject to conditions)" : "restricted / not eligible"}`,
            `• Exempt amount: ₹${formatInr(t.exempt_amount_inr)}`,
            `• Taxable LTCG after claim: ₹${formatInr(t.taxable_ltcg_inr)}`,
            `• CA review required: ${t.requires_ca_review ? "yes" : "no"}`,
            ...t.notes.map((n) => `• ${n}`),
          ].join("\n");
        })()
      : "• Run calculator with sale / reinvestment amounts for a numeric memo.";
    return renderTemplate(responseTemplates.section_54f_memo, {
      strategy_bullets: strategyBullets || "• Section 54F exemption needs full reinvestment of net consideration in one residential house (conditions apply).",
      section_54f_summary: summary,
      citations: citeBlock,
    });
  }

  if (template) {
    return renderTemplate(template, {
      citations: citeBlock || strategyBullets,
      strategy_bullets: strategyBullets || citeBlock,
    });
  }

  if (intent === "firewall") {
    return renderTemplate(responseTemplates.firewall, {
      strategy_bullets: strategyBullets,
      citations: citeBlock,
    });
  }

  if (citations.length > 0) {
    return renderTemplate(responseTemplates.citation_fallback, { citations: citeBlock });
  }

  return responseTemplates.general_help;
}
