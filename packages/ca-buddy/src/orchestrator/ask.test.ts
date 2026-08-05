import { describe, expect, it } from "vitest";
import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import type { DailyGlance, Family, FirewallData, Holding } from "@capstone/types";
import { buildPortfolioContext } from "../context/portfolio";
import { askSync } from "./ask";
import { classifyIntent } from "./classifier";
import { getBuddyConfig } from "../config/loader";

const portfolio = buildPortfolioContext({
  family: family as Family,
  holdings: holdings as Holding[],
  firewall: firewall as FirewallData,
  dailyGlance: dailyGlance as DailyGlance,
});

describe("classifyIntent", () => {
  it("refuses evasion requests via config rules", () => {
    const result = classifyIntent("How can I hide income from the IT department?");
    expect(result.refuse).toBe(true);
    expect(result.intent).toBe("refuse_evasion");
  });

  it("routes HUF gift to Mode B structuring", () => {
    const result = classifyIntent("Can I gift ₹50L to my HUF?");
    expect(result.mode).toBe("B");
    expect(result.sub_minds).toContain("statutory_tax");
  });
});

describe("askSync", () => {
  it("returns portfolio-aware IT exposure from holdings data", () => {
    const response = askSync("What's my real exposure to IT stocks?", { portfolio });
    expect(response.answer).toContain("Kapoor Family");
    expect(response.intent).toBe("portfolio");
    expect(response.tool_traces).toHaveLength(0);
  });

  it("runs calculators from portfolio tax signals for advance tax", () => {
    const response = askSync("Do I need to pay advance tax this quarter?");
    expect(response.tool_traces.some((t) => t.tool === "computeAdvanceTax")).toBe(true);
    expect(response.action_card?.type).toBe("advance_tax");
  });

  it("refuses ITR filing requests", () => {
    const response = askSync("Please file my ITR for me this year");
    expect(response.refused).toBe(true);
    expect(response.escalate_to_ca).toBe(true);
  });

  it("refuses sell-all execution and product recommendation phrasing", () => {
    expect(askSync("Sell all my TATASTEEL shares right now").refused).toBe(true);
    expect(askSync("Which mutual fund scheme should I buy for tax saving?").refused).toBe(true);
  });

  it("loads forbidden phrases from config", () => {
    expect(getBuddyConfig().constitution.forbidden_phrases.length).toBeGreaterThan(0);
  });
});
