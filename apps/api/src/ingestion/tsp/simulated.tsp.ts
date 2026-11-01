import { randomUUID } from "node:crypto";
import { demoData } from "@capstone/demo-data";
import {
  DEMO_FAMILY_ID,
  type FipType,
  type TspClient,
  type TspConsentResult,
  type TspHolding,
} from "./types";

/**
 * Simulated TSP — consent-shaped API without real FIU credentials.
 * Kapoor demo family may ingest fixture AA holdings; real clients get empty AA until CAS/manual.
 */
export class SimulatedTspClient implements TspClient {
  readonly name = "simulated";

  async createConsent(input: {
    familyId: string;
    fipTypes?: FipType[];
    vua?: string;
    redirectUrl?: string;
  }): Promise<TspConsentResult> {
    void input.vua;
    void input.redirectUrl;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const fipTypes = input.fipTypes ?? (["bank", "mf", "demat"] as FipType[]);
    return {
      consentRef: `sim-consent-${randomUUID().slice(0, 8)}`,
      status: "active",
      tsp: this.name,
      fipTypes,
      expiresAt,
      message:
        input.familyId === DEMO_FAMILY_ID
          ? "Simulated AA consent granted (demo fixtures)."
          : "Simulated AA consent granted. Connect CAS or manual accounts until TSP keys are configured.",
    };
  }

  async getConsentStatus(consentRef: string) {
    return { status: consentRef.startsWith("sim-") ? "active" : "unknown" };
  }

  async fetchAccounts(consentRef: string, familyId: string): Promise<TspHolding[]> {
    void consentRef;
    if (familyId !== DEMO_FAMILY_ID) return [];

    return demoData.holdings
      .filter((h) => h.source === "aa")
      .map((h) => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        assetType: h.asset_type,
        custodian: h.custodian,
        quantity: h.quantity,
        currentValueInr: h.current_value_inr,
        costBasisInr: h.cost_basis_inr,
        gainLossInr: h.gain_loss_inr,
        gainType: h.gain_type,
        lots: h.lots.map((l) => ({
          lotId: l.lot_id,
          quantity: l.quantity,
          buyDate: l.buy_date,
          buyPriceInr: l.buy_price_inr,
          currentPriceInr: l.current_price_inr,
          gainLossInr: l.gain_loss_inr,
          gainType: l.gain_type,
        })),
      }));
  }
}
