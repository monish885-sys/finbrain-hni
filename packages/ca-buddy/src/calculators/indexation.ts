import { CII_BY_FY } from "../constants/fy-2025-26";

export interface IndexationInput {
  cost_inr: number;
  purchase_fy: string;
  sale_fy: string;
}

export interface IndexationResult {
  indexed_cost_inr: number;
  cii_purchase: number;
  cii_sale: number;
  indexation_factor: number;
}

export function computeIndexation(input: IndexationInput): IndexationResult {
  const ciiPurchase = CII_BY_FY[input.purchase_fy];
  const ciiSale = CII_BY_FY[input.sale_fy];
  if (!ciiPurchase || !ciiSale) {
    throw new Error(`CII not available for FY ${input.purchase_fy} or ${input.sale_fy}`);
  }
  const factor = ciiSale / ciiPurchase;
  const indexedCost = Math.round(input.cost_inr * factor);
  return {
    indexed_cost_inr: indexedCost,
    cii_purchase: ciiPurchase,
    cii_sale: ciiSale,
    indexation_factor: Math.round(factor * 10000) / 10000,
  };
}
