import { describe, expect, it } from "vitest";
import { computeAdvanceTax } from "./advance-tax";

describe("computeAdvanceTax", () => {
  it("flags advance tax required above ₹10k liability", () => {
    const result = computeAdvanceTax({
      financial_year: "2025-26",
      projected_total_tax_inr: 500_000,
      tds_credited_inr: 100_000,
      advance_tax_paid_inr: 0,
      as_of_date: "2026-06-20",
    });
    expect(result.advance_tax_required).toBe(true);
    expect(result.net_liability_inr).toBe(400_000);
    expect(result.current_quarter).toBe(1);
  });

  it("computes Q1 instalment at 15%", () => {
    const result = computeAdvanceTax({
      financial_year: "2025-26",
      projected_total_tax_inr: 420_000,
      tds_credited_inr: 0,
      advance_tax_paid_inr: 0,
      as_of_date: "2026-06-20",
    });
    expect(result.cumulative_required_inr).toBe(63_000);
    expect(result.instalment_due_inr).toBe(63_000);
    expect(result.due_by).toBe("2026-06-15");
  });

  it("computes 234C interest when late", () => {
    const result = computeAdvanceTax({
      financial_year: "2026-27",
      projected_total_tax_inr: 420_000,
      tds_credited_inr: 0,
      advance_tax_paid_inr: 0,
      as_of_date: "2026-12-20",
    });
    expect(result.interest_234c_inr).toBeGreaterThan(0);
  });
});
