import { describe, expect, it } from "vitest";
import { pairHarvestLots } from "./harvest";
import { computeSection54F } from "./section-54f";
import { computeIndexation } from "./indexation";

describe("pairHarvestLots", () => {
  it("pairs loss against gain lots", () => {
    const result = pairHarvestLots([
      { lot_id: "lot_892", symbol: "TATASTEEL", gain_loss_inr: -3_800_000, gain_type: "stcg" },
      { lot_id: "lot_001", symbol: "INFY", gain_loss_inr: 800_000, gain_type: "stcg" },
      { lot_id: "lot_002", symbol: "RELIANCE", gain_loss_inr: 400_000, gain_type: "stcg" },
    ]);
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.total_tax_saved_inr).toBeGreaterThan(0);
    expect(result.unpaired_losses_inr).toBe(2_600_000);
  });
});

describe("computeSection54F", () => {
  it("computes proportional exemption", () => {
    const result = computeSection54F({
      sale_value_inr: 10_000_000,
      net_consideration_inr: 9_500_000,
      ltcg_inr: 3_000_000,
      reinvestment_inr: 9_500_000,
      is_residential_property: true,
      owns_multiple_residential: false,
    });
    expect(result.eligible).toBe(true);
    expect(result.exempt_amount_inr).toBe(3_000_000);
    expect(result.requires_ca_review).toBe(true);
  });
});

describe("computeIndexation", () => {
  it("indexes cost using CII ratio", () => {
    const result = computeIndexation({
      cost_inr: 1_000_000,
      purchase_fy: "2018-19",
      sale_fy: "2025-26",
    });
    expect(result.indexed_cost_inr).toBeGreaterThan(1_000_000);
    expect(result.cii_purchase).toBe(280);
    expect(result.cii_sale).toBe(378);
  });
});
