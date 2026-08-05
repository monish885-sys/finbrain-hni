import { describe, expect, it } from "vitest";
import type { DailyGlance, Family, FirewallData, Holding } from "@capstone/types";
import { PLATFORM_DISCLAIMER } from "@capstone/types";
import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import { buildPortfolioContext } from "../context/portfolio";
import { analyzeHniFy, formatFyReportAnswer } from "./analyze";

const portfolio = buildPortfolioContext({
  family: family as Family,
  holdings: holdings as Holding[],
  firewall: firewall as FirewallData,
  dailyGlance: dailyGlance as DailyGlance,
});

describe("analyzeHniFy", () => {
  it("returns FY report with calendar, decisions, tools, disclaimer", () => {
    const report = analyzeHniFy(portfolio, {
      financial_year: "2025-26",
      as_of_date: "2026-06-20",
      nominee_gaps: 2,
    });
    expect(report.financial_year).toBe("2025-26");
    expect(report.disclaimer).toBe(PLATFORM_DISCLAIMER);
    expect(report.calendar.length).toBeGreaterThan(0);
    expect(report.decisions.length).toBeGreaterThan(0);
    expect(report.action_cards.some((c) => c.type === "advance_tax")).toBe(true);
    expect(report.tool_traces.some((t) => t.tool === "computeAdvanceTax")).toBe(true);
    expect(report.escalate_to_ca).toBe(true);
  });

  it("formats answer without execution claims", () => {
    const report = analyzeHniFy(portfolio, { as_of_date: "2026-06-20" });
    const answer = formatFyReportAnswer(report);
    expect(answer.toLowerCase()).not.toContain("we will file");
    expect(answer).toContain("consult your CA");
  });
});
