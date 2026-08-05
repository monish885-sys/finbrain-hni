import type { AdvanceTaxInput, AdvanceTaxResult } from "@capstone/types";
import { ADVANCE_TAX_THRESHOLDS } from "../constants/fy-2025-26";

function parseDate(iso: string): Date {
  return new Date(iso);
}

function fyStartYear(fy: string): number {
  return parseInt(fy.split("-")[0], 10);
}

function fyFromDate(d: Date): string {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const end = (year + 1) % 100;
  return `${year}-${String(end).padStart(2, "0")}`;
}

function getCurrentQuarter(asOf: Date): 1 | 2 | 3 | 4 {
  const month = asOf.getMonth() + 1;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

function quarterDueDate(quarter: 1 | 2 | 3 | 4, fy: string): string {
  const startYear = fyStartYear(fy);
  const inst = ADVANCE_TAX_THRESHOLDS.instalments.find((i) => i.quarter === quarter)!;
  const year = inst.due_month >= 4 ? startYear : startYear + 1;
  return `${year}-${String(inst.due_month).padStart(2, "0")}-${String(inst.due_day).padStart(2, "0")}`;
}

/** Simplified 234C interest — 1% per month on shortfall for deferred instalment */
function compute234cInterest(
  netLiability: number,
  paid: number,
  quarter: 1 | 2 | 3 | 4,
  asOf: Date,
  fy: string,
): number {
  const inst = ADVANCE_TAX_THRESHOLDS.instalments.find((i) => i.quarter === quarter)!;
  const requiredCumulative = Math.round(netLiability * inst.cumulative_pct);
  const shortfall = Math.max(0, requiredCumulative - paid);
  if (shortfall <= 0) return 0;

  const due = new Date(quarterDueDate(quarter, fy));
  if (asOf <= due) return 0;

  const monthsLate = Math.max(
    1,
    (asOf.getFullYear() - due.getFullYear()) * 12 + (asOf.getMonth() - due.getMonth()),
  );
  return Math.round(shortfall * 0.01 * monthsLate);
}

export function computeAdvanceTax(input: AdvanceTaxInput): AdvanceTaxResult {
  const asOf = parseDate(input.as_of_date);
  const fy = fyFromDate(asOf);
  const netLiability = Math.max(0, input.projected_total_tax_inr - input.tds_credited_inr);
  const quarter = getCurrentQuarter(asOf);
  const inst = ADVANCE_TAX_THRESHOLDS.instalments.find((i) => i.quarter === quarter)!;
  const cumulativeRequired = Math.round(netLiability * inst.cumulative_pct);
  const cumulativePaid = input.advance_tax_paid_inr;
  const instalmentDue = Math.max(0, cumulativeRequired - cumulativePaid);
  const shortfall = Math.max(0, netLiability - cumulativePaid);
  const interest234c = compute234cInterest(netLiability, cumulativePaid, quarter, asOf, fy);

  return {
    net_liability_inr: netLiability,
    advance_tax_required: netLiability > ADVANCE_TAX_THRESHOLDS.min_liability_inr,
    current_quarter: quarter,
    due_by: quarterDueDate(quarter, fy),
    instalment_due_inr: instalmentDue,
    shortfall_inr: shortfall,
    interest_234c_inr: interest234c,
    cumulative_paid_inr: cumulativePaid,
    cumulative_required_inr: cumulativeRequired,
  };
}
