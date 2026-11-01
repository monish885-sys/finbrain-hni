import type { FipType, TspClient, TspConsentResult, TspHolding } from "./types";
import { SimulatedTspClient } from "./simulated.tsp";

/**
 * HTTP TSP client for Setu / Finvu / etc. when env keys are present.
 * Falls back to simulated create/fetch if the remote call fails in local dev.
 */
export class EnvTspClient implements TspClient {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fallback = new SimulatedTspClient();

  constructor() {
    this.name = process.env.TSP_PROVIDER ?? "env-tsp";
    this.baseUrl = (process.env.TSP_BASE_URL ?? "").replace(/\/$/, "");
    this.apiKey = process.env.TSP_API_KEY ?? "";
  }

  get configured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async createConsent(input: {
    familyId: string;
    fipTypes?: FipType[];
    vua?: string;
    redirectUrl?: string;
  }): Promise<TspConsentResult> {
    if (!this.configured) {
      return this.fallback.createConsent(input);
    }
    try {
      const res = await fetch(`${this.baseUrl}/consents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          familyId: input.familyId,
          fipTypes: input.fipTypes ?? ["bank", "mf", "demat"],
          vua: input.vua,
          redirectUrl: input.redirectUrl,
        }),
      });
      if (!res.ok) throw new Error(`TSP consent HTTP ${res.status}`);
      const data = (await res.json()) as {
        consentRef: string;
        status?: string;
        fipTypes?: FipType[];
        expiresAt?: string;
        redirectUrl?: string;
      };
      const expiresAt = data.expiresAt
        ? new Date(data.expiresAt)
        : (() => {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            return d;
          })();
      return {
        consentRef: data.consentRef,
        status: (data.status as TspConsentResult["status"]) ?? "pending",
        tsp: this.name,
        fipTypes: data.fipTypes ?? ["bank", "mf", "demat"],
        expiresAt,
        redirectUrl: data.redirectUrl,
        message: "TSP consent created — complete approval in the AA journey.",
      };
    } catch {
      return this.fallback.createConsent(input);
    }
  }

  async getConsentStatus(consentRef: string) {
    if (!this.configured) return this.fallback.getConsentStatus(consentRef);
    try {
      const res = await fetch(`${this.baseUrl}/consents/${encodeURIComponent(consentRef)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`TSP status HTTP ${res.status}`);
      return (await res.json()) as { status: string };
    } catch {
      return this.fallback.getConsentStatus(consentRef);
    }
  }

  async fetchAccounts(consentRef: string, familyId: string): Promise<TspHolding[]> {
    if (!this.configured) return this.fallback.fetchAccounts(consentRef, familyId);
    try {
      const res = await fetch(
        `${this.baseUrl}/consents/${encodeURIComponent(consentRef)}/accounts`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
      if (!res.ok) throw new Error(`TSP accounts HTTP ${res.status}`);
      return (await res.json()) as TspHolding[];
    } catch {
      return this.fallback.fetchAccounts(consentRef, familyId);
    }
  }
}
