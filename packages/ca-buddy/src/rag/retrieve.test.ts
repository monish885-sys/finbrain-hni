import { describe, expect, it } from "vitest";
import { getCorpusStore } from "../corpus/store";
import { retrieveCitations } from "./retrieve";

describe("retrieveCitations", () => {
  it("retrieves Section 64 for HUF gift query", () => {
    const citations = retrieveCitations("Can I gift ₹50L to my HUF clubbing Section 64");
    expect(citations.length).toBeGreaterThan(0);
    expect(citations.some((c) => c.section.includes("64"))).toBe(true);
  });

  it("retrieves advance tax sections", () => {
    const citations = retrieveCitations("Do I need to pay advance tax this quarter Section 208");
    expect(citations.some((c) => c.section.includes("208"))).toBe(true);
  });

  it("loads corpus from JSON files", () => {
    expect(getCorpusStore().size).toBeGreaterThan(15);
  });
});
