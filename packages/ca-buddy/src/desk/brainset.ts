import type { Brainset, PortfolioContext } from "@capstone/types";
import { buildFinancialCalendar } from "../calendar/build-calendar";
import { resolveAsOfDate, resolveFinancialYear } from "../extraction/variables";

export interface CreateBrainsetInput {
  family_id: string;
  portfolio: PortfolioContext;
  status?: Brainset["status"];
  as_of_date?: string;
  financial_year?: string;
}

/** Create an in-memory brainset from portfolio context — ready for desk runs before account wiring. */
export function createBrainset(input: CreateBrainsetInput): Brainset {
  const now = new Date().toISOString();
  const asOf = input.as_of_date ?? resolveAsOfDate(input.portfolio);
  const fy =
    input.financial_year ??
    resolveFinancialYear({
      ...input.portfolio,
      tax_signals: {
        ...input.portfolio.tax_signals,
        as_of_date: asOf,
        financial_year: input.financial_year,
      },
    });

  const calendar = buildFinancialCalendar(input.portfolio, {
    financial_year: fy,
    as_of_date: asOf,
    nominee_gaps: input.portfolio.nominee_gaps,
    has_company: input.portfolio.entities_summary.some((e) => /pvt_ltd/i.test(e)),
  });

  return {
    id: `bs-${input.family_id}`,
    family_id: input.family_id,
    family_name: input.portfolio.family_name,
    status: input.status ?? "demo",
    portfolio: input.portfolio,
    financial_year: fy,
    calendar,
    open_day_plan_ids: [],
    ca_prefs: { auto_escalate_structuring: true },
    created_at: now,
    updated_at: now,
  };
}
