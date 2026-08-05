import { describe, expect, it } from "vitest";
import { askDemoSync, getKapoorPortfolio } from "./ask-demo";

describe("askDemo", () => {
  it("builds Kapoor portfolio with entities", () => {
    const portfolio = getKapoorPortfolio();
    expect(portfolio.family_name).toContain("Kapoor");
    expect(portfolio.entity_count).toBeGreaterThan(1);
  });

  it("answers with portfolio context by default", () => {
    const response = askDemoSync("What's my real exposure to IT stocks?");
    expect(response.intent).toBe("portfolio");
    expect(response.answer).toContain("Kapoor");
  });

  it("can omit portfolio when withoutPortfolio is set", () => {
    const response = askDemoSync("What's my real exposure to IT stocks?", {
      withoutPortfolio: true,
    });
    expect(response.answer).not.toContain("Kapoor Family");
  });
});
