import type { TaxRegime, TaxSlabInput, TaxSlabResult } from "@capstone/types";
import {
  CESS_RATE,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  STANDARD_DEDUCTION,
  SUPPORTED_FY,
  computeSurcharge,
} from "../constants/fy-2025-26";

function applySlabs(taxableIncome: number, slabs: readonly { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
    if (taxableInSlab > 0) tax += taxableInSlab * slab.rate;
  }
  return Math.round(tax);
}

export function calculateTaxSlab(input: TaxSlabInput): TaxSlabResult {
  const fy = input.financial_year || SUPPORTED_FY;
  const deductions = input.deductions_inr ?? 0;
  const stdDeduction = STANDARD_DEDUCTION[input.regime];
  const taxableIncome = Math.max(0, input.gross_income_inr - stdDeduction - deductions);
  const slabs = input.regime === "old" ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  const baseTax = applySlabs(taxableIncome, slabs);
  const surcharge = computeSurcharge(baseTax, input.regime, taxableIncome);
  const cess = Math.round((baseTax + surcharge) * CESS_RATE);
  const totalTax = baseTax + surcharge + cess;
  const effectiveRate = input.gross_income_inr > 0 ? (totalTax / input.gross_income_inr) * 100 : 0;

  return {
    taxable_income_inr: taxableIncome,
    base_tax_inr: baseTax,
    surcharge_inr: surcharge,
    cess_inr: cess,
    total_tax_inr: totalTax,
    effective_rate_pct: Math.round(effectiveRate * 100) / 100,
    regime: input.regime,
    financial_year: fy,
  };
}

export function compareTaxRegime(input: {
  financial_year?: string;
  gross_income_inr: number;
  old_regime_deductions_inr: number;
}): import("@capstone/types").RegimeCompareResult {
  const fy = input.financial_year || SUPPORTED_FY;
  const oldRegime = calculateTaxSlab({
    financial_year: fy,
    regime: "old",
    gross_income_inr: input.gross_income_inr,
    deductions_inr: input.old_regime_deductions_inr,
  });
  const newRegime = calculateTaxSlab({
    financial_year: fy,
    regime: "new",
    gross_income_inr: input.gross_income_inr,
    deductions_inr: 0,
  });
  const recommended: TaxRegime = oldRegime.total_tax_inr <= newRegime.total_tax_inr ? "old" : "new";
  const savings = Math.abs(oldRegime.total_tax_inr - newRegime.total_tax_inr);

  return {
    old_regime: oldRegime,
    new_regime: newRegime,
    recommended,
    savings_inr: savings,
  };
}
