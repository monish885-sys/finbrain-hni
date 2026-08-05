import type {
  CalendarEvent,
  CalendarEventCategory,
  CalendarPriority,
  PortfolioContext,
} from "@capstone/types";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADVANCE_TAX_THRESHOLDS } from "../constants/fy-2025-26";
import { computeAdvanceTax } from "../calculators/advance-tax";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CalendarInstalment {
  quarter: number;
  due_month: number;
  due_day: number;
  cumulative_pct: number;
  title: string;
}

interface RecurringEventDef {
  id: string;
  category: CalendarEventCategory;
  title: string;
  details: string;
  offset_from_fy_start_months: number;
  due_day: number;
  priority: CalendarPriority;
  escalate_to_ca: boolean;
  when: string;
}

interface SignalRuleDef {
  id: string;
  category: CalendarEventCategory;
  title: string;
  details: string;
  priority: CalendarPriority;
  escalate_to_ca: boolean;
  when: string;
  due_offset_days: number;
}

interface FinancialCalendarConfig {
  advance_tax_instalments: CalendarInstalment[];
  recurring_events: RecurringEventDef[];
  signal_rules: SignalRuleDef[];
}

export interface BuildCalendarOptions {
  financial_year: string;
  as_of_date: string;
  nominee_gaps?: number;
  has_company?: boolean;
}

let cachedConfig: FinancialCalendarConfig | null = null;

function loadCalendarConfig(): FinancialCalendarConfig {
  if (cachedConfig) return cachedConfig;
  const path = join(__dirname, "../../config/financial-calendar.json");
  cachedConfig = JSON.parse(readFileSync(path, "utf-8")) as FinancialCalendarConfig;
  return cachedConfig;
}

export function resetCalendarConfigCache(): void {
  cachedConfig = null;
}

function fyStartYear(fy: string): number {
  return parseInt(fy.split("-")[0], 10);
}

function instalmentDueDate(fy: string, dueMonth: number, dueDay: number): string {
  const start = fyStartYear(fy);
  const year = dueMonth >= 4 ? start : start + 1;
  return `${year}-${String(dueMonth).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
}

function dateFromFyOffset(fy: string, offsetMonths: number, dueDay: number): string {
  const start = fyStartYear(fy);
  const totalMonths = 3 + offsetMonths; // FY starts April (month index 3)
  const year = start + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(dueDay, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function signalMatches(
  when: string,
  portfolio: PortfolioContext,
  options: BuildCalendarOptions,
): boolean {
  switch (when) {
    case "always":
      return true;
    case "nominee_gaps":
      return (options.nominee_gaps ?? 0) > 0;
    case "has_harvest_lots":
      return (portfolio.harvest_lots?.length ?? 0) > 0;
    case "has_property":
      return (portfolio.property_assets?.length ?? 0) > 0;
    case "has_company":
      return (
        options.has_company === true ||
        portfolio.entities_summary.some((e) => /pvt_ltd|company/i.test(e))
      );
    case "multi_entity":
      return portfolio.entity_count >= 2;
    case "open_mismatches":
      return portfolio.open_mismatches > 0;
    default:
      return false;
  }
}

/**
 * Build dated HNI financial calendar from config + portfolio signals.
 * Instruction-only events — never implies execution.
 */
export function buildFinancialCalendar(
  portfolio: PortfolioContext,
  options: BuildCalendarOptions,
): CalendarEvent[] {
  const config = loadCalendarConfig();
  const events: CalendarEvent[] = [];
  const fy = options.financial_year;

  const projected =
    portfolio.tax_signals?.projected_total_tax_inr ??
    portfolio.tax_signals?.advance_tax_amount_inr ??
    0;
  const advance = computeAdvanceTax({
    financial_year: fy,
    projected_total_tax_inr: projected || 420_000,
    tds_credited_inr: portfolio.tax_signals?.tds_credited_inr ?? 0,
    advance_tax_paid_inr: portfolio.tax_signals?.advance_tax_paid_inr ?? 0,
    as_of_date: options.as_of_date,
  });

  if (advance.advance_tax_required || projected > ADVANCE_TAX_THRESHOLDS.min_liability_inr) {
    for (const inst of config.advance_tax_instalments) {
      const due = instalmentDueDate(fy, inst.due_month, inst.due_day);
      const required = Math.round(advance.net_liability_inr * inst.cumulative_pct);
      events.push({
        id: `advance-tax-q${inst.quarter}`,
        category: "advance_tax",
        due_date: due,
        priority: "high",
        title: inst.title,
        details: `Suggested cumulative advance tax by ${due}: ₹${required.toLocaleString("en-IN")}. Pay via challan ITNS 280 externally. Review with your CA.`,
        escalate_to_ca: false,
      });
    }
  }

  for (const rec of config.recurring_events) {
    if (!signalMatches(rec.when, portfolio, options)) continue;
    events.push({
      id: rec.id,
      category: rec.category,
      due_date: dateFromFyOffset(fy, rec.offset_from_fy_start_months, rec.due_day),
      priority: rec.priority,
      title: rec.title,
      details: rec.details,
      escalate_to_ca: rec.escalate_to_ca,
    });
  }

  for (const rule of config.signal_rules) {
    if (!signalMatches(rule.when, portfolio, options)) continue;
    events.push({
      id: rule.id,
      category: rule.category,
      due_date: addDays(options.as_of_date, rule.due_offset_days),
      priority: rule.priority,
      title: rule.title,
      details: `${rule.details} (${portfolio.open_mismatches} open mismatches; status: ${portfolio.firewall_status}).`,
      escalate_to_ca: rule.escalate_to_ca,
    });
  }

  return events.sort((a, b) => a.due_date.localeCompare(b.due_date));
}
