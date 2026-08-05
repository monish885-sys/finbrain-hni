import type { PortfolioContext } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";
import { SUPPORTED_FY } from "../constants/fy-2025-26";

/** Parse ₹ amounts: 50L, 5Cr, 420000, ₹4.2L */
export function parseInrFromQuery(query: string): number[] {
  const amounts: number[] = [];
  const patterns = [
    /₹?\s*([\d,.]+)\s*cr(?:ore)?/gi,
    /₹?\s*([\d,.]+)\s*l(?:akh)?/gi,
    /₹?\s*([\d,]+)/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(query)) !== null) {
      const raw = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isNaN(raw)) continue;
      if (/cr/i.test(m[0])) amounts.push(Math.round(raw * 10_000_000));
      else if (/l/i.test(m[0]) && !/₹?\s*[\d,]+$/.test(m[0])) amounts.push(Math.round(raw * 100_000));
      else amounts.push(Math.round(raw));
    }
  }
  return amounts;
}

export function extractSymbolFromQuery(query: string, knownSymbols: string[]): string | undefined {
  const upper = query.toUpperCase();
  return knownSymbols.find((s) => upper.includes(s.toUpperCase()));
}

export function resolveAsOfDate(portfolio?: PortfolioContext): string {
  return portfolio?.tax_signals?.as_of_date ?? new Date().toISOString().slice(0, 10);
}

export function resolveFinancialYear(portfolio?: PortfolioContext): string {
  return portfolio?.tax_signals?.financial_year ?? inferFyFromDate(resolveAsOfDate(portfolio));
}

function inferFyFromDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const end = (year + 1) % 100;
  return `${year}-${String(end).padStart(2, "0")}`;
}

export function resolveGrossIncome(query: string, portfolio?: PortfolioContext): number {
  const parsed = parseInrFromQuery(query);
  if (parsed.length > 0) return parsed[0];
  if (portfolio?.estimated_gross_income_inr) return portfolio.estimated_gross_income_inr;
  const factor = getBuddyConfig().runtime.defaults.gross_income_factor_of_networth;
  if (portfolio?.total_net_worth_inr) return Math.round(portfolio.total_net_worth_inr * factor);
  return 3_000_000;
}

export function resolveDeductions(portfolio?: PortfolioContext): number {
  return portfolio?.old_regime_deductions_inr ?? getBuddyConfig().runtime.defaults.old_regime_deductions_inr;
}
