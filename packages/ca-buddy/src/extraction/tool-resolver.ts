import type { HarvestLot, PortfolioContext, ToolTrace } from "@capstone/types";
import { CALCULATOR_REGISTRY } from "../calculators";
import { getBuddyConfig } from "../config/loader";
import {
  extractSymbolFromQuery,
  parseInrFromQuery,
  resolveAsOfDate,
  resolveDeductions,
  resolveFinancialYear,
  resolveGrossIncome,
} from "./variables";

function hashInputs(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url").slice(0, 16);
}

export function resolveHarvestLots(query: string, portfolio?: PortfolioContext): HarvestLot[] {
  const allLots = portfolio?.harvest_lots ?? [];
  if (allLots.length === 0) return [];

  const symbols = [...new Set(allLots.map((l) => l.symbol))];
  const targetSymbol = extractSymbolFromQuery(query, symbols);

  if (targetSymbol) {
    const filtered = allLots.filter((l) => l.symbol.toUpperCase() === targetSymbol.toUpperCase());
    const losses = filtered.filter((l) => l.gain_loss_inr < 0);
    const gains = allLots.filter((l) => l.gain_loss_inr > 0);
    return [...losses, ...gains];
  }

  return allLots;
}

export function resolveCapitalGainsInput(query: string, portfolio?: PortfolioContext) {
  const properties = portfolio?.property_assets ?? [];
  const q = query.toLowerCase();
  const queryTokens = q.split(/\s+/).filter((w) => w.length > 3);

  const matched =
    properties.find((p) => {
      const name = p.name.toLowerCase();
      return queryTokens.some((t) => name.includes(t));
    }) ?? properties[0];

  if (matched) {
    return {
      asset_class: "property" as const,
      sale_value_inr: matched.value_inr,
      cost_inr: matched.cost_inr,
      purchase_date: matched.purchase_date ?? "2020-01-01",
      sale_date: resolveAsOfDate(portfolio),
    };
  }

  const parsed = parseInrFromQuery(query);
  const defaults = getBuddyConfig().runtime.defaults;
  const saleValue = parsed[0] ?? defaults.property_sale_inr;
  return {
    asset_class: "property" as const,
    sale_value_inr: saleValue,
    cost_inr: Math.round(saleValue * 0.8),
    purchase_date: "2020-01-01",
    sale_date: resolveAsOfDate(portfolio),
  };
}

export function resolveSection54FInput(query: string, portfolio?: PortfolioContext) {
  const cg = resolveCapitalGainsInput(query, portfolio);
  const amounts = parseInrFromQuery(query);
  const sale = cg.sale_value_inr;
  const cost = cg.cost_inr;
  const ltcg = Math.max(0, sale - cost);
  const reinvestment = amounts[1] ?? Math.round(sale * 0.9);
  return {
    sale_value_inr: sale,
    net_consideration_inr: sale,
    ltcg_inr: ltcg,
    reinvestment_inr: reinvestment,
    is_residential_property: true,
    owns_multiple_residential: /owns?\s+(two|multiple|more\s+than\s+one)/i.test(query),
  };
}

export function runToolsForIntent(
  intent: string,
  query: string,
  portfolio?: PortfolioContext,
): ToolTrace[] {
  const config = getBuddyConfig();
  const toolNames = config.runtime.tool_bindings[intent] ?? [];
  const traces: ToolTrace[] = [];

  for (const toolName of toolNames) {
    const calc = CALCULATOR_REGISTRY[toolName as keyof typeof CALCULATOR_REGISTRY];
    if (!calc) continue;

    let input: unknown;
    switch (toolName) {
      case "compareTaxRegime":
        input = {
          financial_year: resolveFinancialYear(portfolio),
          gross_income_inr: resolveGrossIncome(query, portfolio),
          old_regime_deductions_inr: resolveDeductions(portfolio),
        };
        break;
      case "calculateTaxSlab":
        input = {
          financial_year: resolveFinancialYear(portfolio),
          regime: /old\s+regime/i.test(query) ? "old" : "new",
          gross_income_inr: resolveGrossIncome(query, portfolio),
          deductions_inr: /old\s+regime/i.test(query) ? resolveDeductions(portfolio) : 0,
        };
        break;
      case "computeAdvanceTax":
        input = {
          financial_year: resolveFinancialYear(portfolio),
          projected_total_tax_inr:
            portfolio?.tax_signals?.projected_total_tax_inr ??
            portfolio?.tax_signals?.advance_tax_amount_inr ??
            getBuddyConfig().runtime.defaults.projected_tax_inr,
          tds_credited_inr: portfolio?.tax_signals?.tds_credited_inr ?? 0,
          advance_tax_paid_inr: portfolio?.tax_signals?.advance_tax_paid_inr ?? 0,
          as_of_date: resolveAsOfDate(portfolio),
        };
        break;
      case "pairHarvestLots":
        input = resolveHarvestLots(query, portfolio);
        if ((input as HarvestLot[]).length === 0) continue;
        break;
      case "computeStcgLtcg":
        input = resolveCapitalGainsInput(query, portfolio);
        break;
      case "computeSection54F":
        input = resolveSection54FInput(query, portfolio);
        break;
      case "computeIndexation": {
        const cg = resolveCapitalGainsInput(query, portfolio);
        const purchaseFy = (() => {
          const d = new Date(cg.purchase_date);
          const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
          return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
        })();
        input = {
          cost_inr: cg.cost_inr,
          purchase_fy: purchaseFy,
          sale_fy: resolveFinancialYear(portfolio),
        };
        break;
      }
      default:
        continue;
    }

    try {
      const output = calc(input as never);
      traces.push({ tool: toolName, inputs_hash: hashInputs(input), output });
    } catch {
      // Fail closed on calculator errors — skip tool, do not invent numbers
    }
  }

  return traces;
}
