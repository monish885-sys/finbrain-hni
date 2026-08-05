export { calculateTaxSlab, compareTaxRegime } from "./tax-slab";
export { computeStcgLtcg } from "./capital-gains";
export { computeIndexation } from "./indexation";
export type { IndexationInput, IndexationResult } from "./indexation";
export { computeAdvanceTax } from "./advance-tax";
export { computeSection54F } from "./section-54f";
export { pairHarvestLots } from "./harvest";

import { computeAdvanceTax } from "./advance-tax";
import { computeStcgLtcg } from "./capital-gains";
import { pairHarvestLots } from "./harvest";
import { computeSection54F } from "./section-54f";
import { calculateTaxSlab, compareTaxRegime } from "./tax-slab";
import { computeIndexation } from "./indexation";

export const CALCULATOR_REGISTRY = {
  calculateTaxSlab,
  compareTaxRegime,
  computeStcgLtcg,
  computeIndexation,
  computeAdvanceTax,
  computeSection54F,
  pairHarvestLots,
} as const;

export type CalculatorName = keyof typeof CALCULATOR_REGISTRY;
