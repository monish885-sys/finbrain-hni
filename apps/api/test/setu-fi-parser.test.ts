import { describe, expect, it } from "vitest";
import { parseSetuFiPayload } from "../src/ingestion/tsp/setu-fi-parser";

describe("parseSetuFiPayload", () => {
  it("maps deposit summary to cash holding", () => {
    const holdings = parseSetuFiPayload({
      fips: [
        {
          fipID: "HDFC-FIP",
          accounts: [
            {
              linkRefNumber: "link1",
              data: {
                account: {
                  type: "deposit",
                  maskedAccNumber: "XXXXXX4373",
                  summary: { currentBalance: "101666.33", type: "SAVINGS", branch: "Jayanagar" },
                },
              },
            },
          ],
        },
      ],
    });
    expect(holdings).toHaveLength(1);
    expect(holdings[0].assetType).toBe("cash");
    expect(holdings[0].currentValueInr).toBeCloseTo(101666.33);
  });

  it("maps mutual fund holdings", () => {
    const holdings = parseSetuFiPayload({
      fiData: [
        {
          fipID: "CAMS",
          data: [
            {
              linkRefNumber: "mf1",
              decryptedFI: {
                account: {
                  type: "mutualfunds",
                  summary: {
                    Holding: [
                      {
                        isin: "INF123",
                        schemeName: "PPFAS Flexi Cap",
                        closingUnits: "10",
                        nav: "100",
                        currentValue: "1000",
                        costValue: "800",
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    });
    expect(holdings).toHaveLength(1);
    expect(holdings[0].symbol).toBe("INF123");
    expect(holdings[0].assetType).toBe("mutual_fund");
    expect(holdings[0].currentValueInr).toBe(1000);
  });
});
