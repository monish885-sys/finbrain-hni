/** Pluggable Account Aggregator TSP client — read-only FI data. */

export type FipType = "bank" | "mf" | "demat";

export type TspHolding = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  custodian: string;
  quantity: number;
  currentValueInr: number;
  costBasisInr: number;
  gainLossInr: number;
  gainType: string;
  lots: Array<{
    lotId: string;
    quantity: number;
    buyDate: string;
    buyPriceInr: number;
    currentPriceInr: number;
    gainLossInr: number;
    gainType: string;
  }>;
};

export type TspConsentResult = {
  consentRef: string;
  status: "pending" | "active" | "revoked" | "expired";
  tsp: string;
  fipTypes: FipType[];
  expiresAt: Date;
  redirectUrl?: string;
  message?: string;
};

export interface TspClient {
  readonly name: string;
  createConsent(input: {
    familyId: string;
    fipTypes?: FipType[];
  }): Promise<TspConsentResult>;
  getConsentStatus(consentRef: string): Promise<{ status: string }>;
  /** Fetch holdings for an active consent. Empty until real FI data or demo sandbox. */
  fetchAccounts(consentRef: string, familyId: string): Promise<TspHolding[]>;
}

export const DEMO_FAMILY_ID = "fam_kapoor_001";
