import { describe, expect, it } from "vitest";
import { computeStcgLtcg } from "./capital-gains";

describe("computeStcgLtcg", () => {
  it("taxes equity STCG at 20%", () => {
    const result = computeStcgLtcg({
      asset_class: "equity",
      sale_value_inr: 1_000_000,
      cost_inr: 800_000,
      purchase_date: "2025-06-01",
      sale_date: "2025-12-01",
      is_listed_equity: true,
    });
    expect(result.gain_type).toBe("stcg");
    expect(result.tax_inr).toBe(40_000);
    expect(result.section).toBe("Section 111A");
  });

  it("applies LTCG exemption for equity", () => {
    const result = computeStcgLtcg({
      asset_class: "equity",
      sale_value_inr: 500_000,
      cost_inr: 300_000,
      purchase_date: "2024-01-01",
      sale_date: "2026-01-01",
      is_listed_equity: true,
    });
    expect(result.gain_type).toBe("ltcg");
    expect(result.exemption_inr).toBe(125_000);
    expect(result.tax_inr).toBe(Math.round((200_000 - 125_000) * 0.125));
  });

  it("taxes property LTCG at 12.5%", () => {
    const result = computeStcgLtcg({
      asset_class: "property",
      sale_value_inr: 15_000_000,
      cost_inr: 12_000_000,
      purchase_date: "2020-01-01",
      sale_date: "2026-06-01",
    });
    expect(result.gain_type).toBe("ltcg");
    expect(result.tax_inr).toBe(375_000);
    expect(result.section).toBe("Section 112(1)(iii)");
  });

  it("returns no tax on loss", () => {
    const result = computeStcgLtcg({
      asset_class: "equity",
      sale_value_inr: 500_000,
      cost_inr: 900_000,
      purchase_date: "2025-01-01",
      sale_date: "2025-06-01",
    });
    expect(result.gain_inr).toBeLessThan(0);
    expect(result.tax_inr).toBe(0);
  });
});
