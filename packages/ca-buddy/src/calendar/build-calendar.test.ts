import { describe, expect, it } from "vitest";
import type { DailyGlance, Family, FirewallData, Holding } from "@capstone/types";
import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import { buildFinancialCalendar } from "./build-calendar";
import { buildPortfolioContext } from "../context/portfolio";

const portfolio = buildPortfolioContext({
  family: family as Family,
  holdings: holdings as Holding[],
  firewall: firewall as FirewallData,
  dailyGlance: dailyGlance as DailyGlance,
});

describe("buildFinancialCalendar", () => {
  it("emits dated advance tax and recurring events from config", () => {
    const events = buildFinancialCalendar(portfolio, {
      financial_year: "2025-26",
      as_of_date: "2026-06-20",
      nominee_gaps: 2,
    });
    expect(events.length).toBeGreaterThan(4);
    expect(events.some((e) => e.category === "advance_tax")).toBe(true);
    expect(events.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.due_date))).toBe(true);
    const dates = events.map((e) => e.due_date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("includes firewall signal when mismatches open", () => {
    const events = buildFinancialCalendar(portfolio, {
      financial_year: "2025-26",
      as_of_date: "2026-06-20",
    });
    expect(events.some((e) => e.id === "firewall-open")).toBe(true);
  });
});
