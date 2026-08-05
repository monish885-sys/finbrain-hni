import type { CgLotInput, CgLotResult } from "@capstone/types";
import {
  DEBT_LTCG_INDEXED_RATE,
  EQUITY_LTCG_EXEMPTION,
  EQUITY_LTCG_RATE,
  EQUITY_STCG_RATE,
  PROPERTY_LTCG_RATE,
} from "../constants/fy-2025-26";
import { computeIndexation } from "./indexation";

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

export function computeStcgLtcg(input: CgLotInput): CgLotResult {
  const holdingMonths = monthsBetween(input.purchase_date, input.sale_date);
  const rawGain = input.sale_value_inr - input.cost_inr;

  if (rawGain <= 0) {
    return {
      gain_inr: rawGain,
      gain_type: "none",
      tax_inr: 0,
      holding_months: holdingMonths,
      exemption_inr: 0,
      section: "N/A",
    };
  }

  if (input.asset_class === "equity" && input.is_listed_equity !== false) {
    const isLtcg = holdingMonths >= 12;
    if (isLtcg) {
      const taxableGain = Math.max(0, rawGain - EQUITY_LTCG_EXEMPTION);
      return {
        gain_inr: rawGain,
        gain_type: "ltcg",
        tax_inr: Math.round(taxableGain * EQUITY_LTCG_RATE),
        holding_months: holdingMonths,
        exemption_inr: Math.min(rawGain, EQUITY_LTCG_EXEMPTION),
        section: "Section 112A",
      };
    }
    return {
      gain_inr: rawGain,
      gain_type: "stcg",
      tax_inr: Math.round(rawGain * EQUITY_STCG_RATE),
      holding_months: holdingMonths,
      exemption_inr: 0,
      section: "Section 111A",
    };
  }

  if (input.asset_class === "property") {
    const isLtcg = holdingMonths >= 24;
    if (!isLtcg) {
      return {
        gain_inr: rawGain,
        gain_type: "stcg",
        tax_inr: 0,
        holding_months: holdingMonths,
        exemption_inr: 0,
        section: "Slab rate (STCG property)",
      };
    }
    return {
      gain_inr: rawGain,
      gain_type: "ltcg",
      tax_inr: Math.round(rawGain * PROPERTY_LTCG_RATE),
      holding_months: holdingMonths,
      exemption_inr: 0,
      section: "Section 112(1)(iii)",
    };
  }

  if (input.asset_class === "debt") {
    const isLtcg = holdingMonths >= 36;
    if (isLtcg && input.indexation_applicable) {
      const indexed = computeIndexation({
        cost_inr: input.cost_inr,
        purchase_fy: purchaseFyFromDate(input.purchase_date),
        sale_fy: purchaseFyFromDate(input.sale_date),
      });
      const indexedGain = input.sale_value_inr - indexed.indexed_cost_inr;
      const gain = Math.max(0, indexedGain);
      return {
        gain_inr: gain,
        gain_type: "ltcg",
        tax_inr: Math.round(gain * DEBT_LTCG_INDEXED_RATE),
        holding_months: holdingMonths,
        exemption_inr: 0,
        section: "Section 112(1)(ii)",
      };
    }
    return {
      gain_inr: rawGain,
      gain_type: isLtcg ? "ltcg" : "stcg",
      tax_inr: 0,
      holding_months: holdingMonths,
      exemption_inr: 0,
      section: "Slab rate (debt MF post Apr 2023)",
    };
  }

  return {
    gain_inr: rawGain,
    gain_type: holdingMonths >= 36 ? "ltcg" : "stcg",
    tax_inr: 0,
    holding_months: holdingMonths,
    exemption_inr: 0,
    section: "General CG",
  };
}

function purchaseFyFromDate(isoDate: string): string {
  const d = new Date(isoDate);
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const end = (year + 1) % 100;
  return `${year}-${String(end).padStart(2, "0")}`;
}
