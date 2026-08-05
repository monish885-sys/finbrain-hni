/** FY-versioned tax constants — AY 2026-27 / FY 2025-26 */

export const SUPPORTED_FY = "2025-26" as const;

export const STANDARD_DEDUCTION = {
  old: 50_000,
  new: 75_000,
} as const;

export const OLD_REGIME_SLABS = [
  { min: 0, max: 250_000, rate: 0 },
  { min: 250_000, max: 500_000, rate: 0.05 },
  { min: 500_000, max: 1_000_000, rate: 0.2 },
  { min: 1_000_000, max: Infinity, rate: 0.3 },
] as const;

export const NEW_REGIME_SLABS = [
  { min: 0, max: 400_000, rate: 0 },
  { min: 400_000, max: 800_000, rate: 0.05 },
  { min: 800_000, max: 1_200_000, rate: 0.1 },
  { min: 1_200_000, max: 1_600_000, rate: 0.15 },
  { min: 1_600_000, max: 2_000_000, rate: 0.2 },
  { min: 2_000_000, max: 2_400_000, rate: 0.25 },
  { min: 2_400_000, max: Infinity, rate: 0.3 },
] as const;

export const CESS_RATE = 0.04;

/** Surcharge brackets on base tax (individual) */
export function computeSurcharge(baseTax: number, regime: "old" | "new", taxableIncome: number): number {
  if (taxableIncome <= 5_000_000) return 0;
  let rate = 0;
  if (taxableIncome <= 10_000_000) rate = 0.1;
  else if (taxableIncome <= 20_000_000) rate = 0.15;
  else if (taxableIncome <= 50_000_000) rate = 0.25;
  else rate = regime === "new" ? 0.25 : 0.37;
  return Math.round(baseTax * rate);
}

export const EQUITY_STCG_RATE = 0.2;
export const EQUITY_LTCG_RATE = 0.125;
export const EQUITY_LTCG_EXEMPTION = 125_000;
export const PROPERTY_LTCG_RATE = 0.125;
export const DEBT_LTCG_INDEXED_RATE = 0.2;

/** Cost Inflation Index — selected FY values */
export const CII_BY_FY: Record<string, number> = {
  "2018-19": 280,
  "2019-20": 289,
  "2020-21": 301,
  "2021-22": 317,
  "2022-23": 331,
  "2023-24": 348,
  "2024-25": 363,
  "2025-26": 378,
};

export const ADVANCE_TAX_THRESHOLDS = {
  min_liability_inr: 10_000,
  instalments: [
    { quarter: 1 as const, cumulative_pct: 0.15, due_month: 6, due_day: 15 },
    { quarter: 2 as const, cumulative_pct: 0.45, due_month: 9, due_day: 15 },
    { quarter: 3 as const, cumulative_pct: 0.75, due_month: 12, due_day: 15 },
    { quarter: 4 as const, cumulative_pct: 1.0, due_month: 3, due_day: 15 },
  ],
};
