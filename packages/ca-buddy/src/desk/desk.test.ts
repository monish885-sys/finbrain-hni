import { describe, expect, it } from "vitest";
import type { DailyGlance, Family, FirewallData, Holding } from "@capstone/types";
import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import { buildPortfolioContext } from "../context/portfolio";
import {
  applyCaReview,
  applyHniApproval,
  buildCaReviewPack,
  createBrainset,
  hniClearedActionCards,
  runDailyDesk,
} from "./index";

function demoBrainset() {
  const portfolio = buildPortfolioContext({
    family: family as Family,
    holdings: holdings as Holding[],
    firewall: firewall as FirewallData,
    dailyGlance: dailyGlance as DailyGlance,
  });
  return createBrainset({
    family_id: "kapoor-demo",
    portfolio,
    status: "demo",
  });
}

describe("operating desk", () => {
  it("creates a brainset with unique calendar", () => {
    const bs = demoBrainset();
    expect(bs.id).toContain("kapoor");
    expect(bs.calendar.length).toBeGreaterThan(0);
    expect(bs.portfolio.family_name).toBeTruthy();
  });

  it("runs daily desk into a Day Plan with CA pack", () => {
    const bs = demoBrainset();
    const plan = runDailyDesk(bs);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.tool_traces.some((t) => t.tool === "computeAdvanceTax")).toBe(true);
    expect(plan.status).toBe("awaiting_ca");

    const pack = buildCaReviewPack(bs, plan);
    expect(pack.items_awaiting_ca.length).toBeGreaterThan(0);
    expect(pack.summary.toLowerCase()).toContain("ca");
  });

  it("enforces Fin → CA → HNI approval without auto-execute", () => {
    const bs = demoBrainset();
    let plan = runDailyDesk(bs);
    const first = plan.items[0];
    expect(first.status).toBe("proposed");

    plan = applyCaReview(plan, [{ item_id: first.id, action: "approve", note: "OK" }]);
    expect(plan.items.find((i) => i.id === first.id)?.status).toBe("ca_approved");
    expect(hniClearedActionCards(plan)).toHaveLength(0);

    plan = applyHniApproval(plan, [{ item_id: first.id, action: "approve" }]);
    expect(plan.items.find((i) => i.id === first.id)?.status).toBe("hni_approved");
    if (first.action_card) {
      expect(hniClearedActionCards(plan).length).toBeGreaterThan(0);
    }
  });

  it("lets CA reject an item so HNI never sees it as cleared", () => {
    const bs = demoBrainset();
    let plan = runDailyDesk(bs);
    const first = plan.items[0];
    plan = applyCaReview(plan, [{ item_id: first.id, action: "reject", note: "Not applicable" }]);
    plan = applyHniApproval(plan, [{ item_id: first.id, action: "approve" }]);
    expect(plan.items.find((i) => i.id === first.id)?.status).toBe("ca_rejected");
    expect(hniClearedActionCards(plan).every((c) => c.title !== first.title)).toBe(true);
  });
});
