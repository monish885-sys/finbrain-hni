import { describe, expect, it } from "vitest";
import { calculateTaxSlab, compareTaxRegime } from "./tax-slab";

describe("calculateTaxSlab", () => {
  it("computes zero tax for income below new regime exemption", () => {
    const result = calculateTaxSlab({
      financial_year: "2025-26",
      regime: "new",
      gross_income_inr: 400_000,
    });
    expect(result.total_tax_inr).toBe(0);
  });

  it("computes tax at ₹50L income old regime", () => {
    const result = calculateTaxSlab({
      financial_year: "2025-26",
      regime: "old",
      gross_income_inr: 5_000_000,
      deductions_inr: 150_000,
    });
    expect(result.taxable_income_inr).toBe(4_800_000);
    expect(result.base_tax_inr).toBe(1_252_500);
    expect(result.total_tax_inr).toBeGreaterThan(1_200_000);
  });

  it("applies surcharge above ₹1Cr", () => {
    const result = calculateTaxSlab({
      financial_year: "2025-26",
      regime: "old",
      gross_income_inr: 12_000_000,
      deductions_inr: 0,
    });
    expect(result.surcharge_inr).toBeGreaterThan(0);
    expect(result.total_tax_inr).toBeGreaterThan(result.base_tax_inr);
  });
});

describe("compareTaxRegime", () => {
  it("recommends old regime when deductions are high", () => {
    const result = compareTaxRegime({
      financial_year: "2025-26",
      gross_income_inr: 10_000_000,
      old_regime_deductions_inr: 2_000_000,
    });
    expect(result.old_regime.total_tax_inr).toBeLessThan(result.new_regime.total_tax_inr);
    expect(result.recommended).toBe("old");
  });

  it("recommends new regime when deductions are low", () => {
    const result = compareTaxRegime({
      financial_year: "2025-26",
      gross_income_inr: 2_500_000,
      old_regime_deductions_inr: 0,
    });
    expect(result.recommended).toBe("new");
  });
});
