/**
 * Setu AA Gateway TSP client — unified banks / MF / demat via RBI Account Aggregator.
 * Docs: https://docs.setu.co/data/account-aggregator
 *
 * Auth: OAuth client credentials → Bearer token + x-product-instance-id.
 * Never falls back to simulated when credentials are configured (fail loudly).
 */
import type { FipType, TspClient, TspConsentResult, TspHolding } from "./types";
import { parseSetuFiPayload } from "./setu-fi-parser";

const DEFAULT_FI_TYPES = [
  "DEPOSIT",
  "MUTUAL_FUNDS",
  "EQUITIES",
  "ETF",
  "NPS",
  "TERM_DEPOSIT",
  "RECURRING_DEPOSIT",
];

export function setuMissingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.SETU_CLIENT_ID && !process.env.TSP_CLIENT_ID) missing.push("SETU_CLIENT_ID");
  if (!process.env.SETU_CLIENT_SECRET && !process.env.TSP_CLIENT_SECRET && !process.env.TSP_API_KEY) {
    missing.push("SETU_CLIENT_SECRET");
  }
  if (!process.env.SETU_PRODUCT_INSTANCE_ID && !process.env.TSP_PRODUCT_INSTANCE_ID) {
    missing.push("SETU_PRODUCT_INSTANCE_ID");
  }
  return missing;
}

export function setuConfigured(): boolean {
  return setuMissingEnv().length === 0;
}

function env(name: string, ...alts: string[]): string {
  for (const k of [name, ...alts]) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return "";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class SetuTspClient implements TspClient {
  readonly name = "setu";
  private token: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl(): string {
    return env("SETU_BASE_URL", "TSP_BASE_URL").replace(/\/$/, "") || "https://fiu-sandbox.setu.co";
  }

  private get tokenUrl(): string {
    return (
      env("SETU_TOKEN_URL") ||
      (this.baseUrl.includes("sandbox")
        ? "https://uat.setu.co/api/v2/auth/token"
        : "https://prod.setu.co/api/v2/auth/token")
    );
  }

  private get clientId(): string {
    return env("SETU_CLIENT_ID", "TSP_CLIENT_ID");
  }

  private get clientSecret(): string {
    return env("SETU_CLIENT_SECRET", "TSP_CLIENT_SECRET", "TSP_API_KEY");
  }

  private get productInstanceId(): string {
    return env("SETU_PRODUCT_INSTANCE_ID", "TSP_PRODUCT_INSTANCE_ID");
  }

  private get redirectUrl(): string {
    const web = env("WEB_APP_URL") || "http://localhost:3000";
    return env("SETU_REDIRECT_URL") || `${web}/onboarding/connect/aa-return`;
  }

  get configured(): boolean {
    return setuConfigured();
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) return this.token;

    const res = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientID: this.clientId,
        secret: this.clientSecret,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Setu token HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      accessToken?: string;
      token?: string;
      expiresIn?: number;
      expires_in?: number;
      success?: boolean;
      data?: {
        token?: string;
        access_token?: string;
        expiresIn?: number;
        expires_in?: number;
      };
    };
    const access =
      data.access_token ??
      data.accessToken ??
      data.token ??
      data.data?.token ??
      data.data?.access_token;
    if (!access) throw new Error("Setu token response missing access_token");
    const expiresIn = Number(
      data.expiresIn ?? data.expires_in ?? data.data?.expiresIn ?? data.data?.expires_in ?? 1800,
    );
    this.token = access;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    return access;
  }

  private async api<T>(
    method: string,
    path: string,
    body?: unknown,
    retryAuth = true,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-product-instance-id": this.productInstanceId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401 && retryAuth) {
      this.token = null;
      return this.api(method, path, body, false);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text.slice(0, 400);
      try {
        const err = JSON.parse(text) as { errorMsg?: string; traceId?: string; message?: string };
        detail = [err.errorMsg || err.message, err.traceId ? `traceId=${err.traceId}` : ""]
          .filter(Boolean)
          .join(" ");
      } catch {
        /* keep raw */
      }
      throw new Error(`Setu ${method} ${path} → HTTP ${res.status}: ${detail}`);
    }
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  private fipTypesToFiTypes(fipTypes?: FipType[]): string[] {
    if (!fipTypes?.length) return DEFAULT_FI_TYPES;
    const map: Record<FipType, string[]> = {
      bank: ["DEPOSIT", "TERM_DEPOSIT", "RECURRING_DEPOSIT"],
      mf: ["MUTUAL_FUNDS", "ETF", "NPS"],
      demat: ["EQUITIES", "ETF"],
    };
    return [...new Set(fipTypes.flatMap((t) => map[t] ?? []))];
  }

  async createConsent(input: {
    familyId: string;
    fipTypes?: FipType[];
    vua?: string;
    redirectUrl?: string;
  }): Promise<TspConsentResult> {
    if (!this.configured) {
      throw new Error(
        `Setu not configured. Set ${setuMissingEnv().join(", ")} in apps/api/.env (from Setu Bridge → AA product credentials).`,
      );
    }
    const vua = (input.vua ?? "").replace(/\D/g, "");
    if (vua.length < 10) {
      throw new Error("Mobile number (10 digits) required for Account Aggregator VUA");
    }

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 3);
    const to = new Date(now);
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const redirectBase = input.redirectUrl ?? this.redirectUrl;
    let redirect: string;
    try {
      const u = new URL(redirectBase);
      u.searchParams.set("familyId", input.familyId);
      redirect = u.toString();
    } catch {
      redirect = `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}familyId=${encodeURIComponent(input.familyId)}`;
    }

    const body = {
      consentDuration: { unit: "MONTH", value: "12" },
      vua,
      dataRange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      redirectUrl: redirect,
      additionalParams: {
        tags: ["CAPSTONE", input.familyId],
      },
    };

    // Prefer Bridge product template for purpose/fiTypes/consentTypes — sending a
    // minimal consent avoids conflicting with Bridge Step-1 config (Setu 500s).
    const data = await this.api<{
      id: string;
      url?: string;
      status?: string;
      detail?: { consentExpiry?: string; fiTypes?: string[] };
      traceId?: string;
      errorMsg?: string;
    }>("POST", "/v2/consents", body);

    const fipTypes: FipType[] = input.fipTypes ?? ["bank", "mf", "demat"];
    return {
      consentRef: data.id,
      status: mapSetuConsentStatus(data.status),
      tsp: this.name,
      fipTypes,
      expiresAt: data.detail?.consentExpiry ? new Date(data.detail.consentExpiry) : expiresAt,
      redirectUrl: data.url,
      message: "Complete Account Aggregator consent on Setu — link banks, MF, and demat.",
    };
  }

  async getConsentStatus(consentRef: string) {
    const data = await this.api<{ status?: string }>("GET", `/v2/consents/${encodeURIComponent(consentRef)}`);
    return { status: data.status ?? "unknown" };
  }

  /**
   * Create data session, poll until PARTIAL/COMPLETED (or timeout), return mapped holdings.
   * Used when webhook is unavailable (local) or as a sync refresh.
   */
  async fetchAccounts(consentRef: string, familyId: string): Promise<TspHolding[]> {
    void familyId;
    const status = await this.getConsentStatus(consentRef);
    const normalized = status.status.toUpperCase();
    if (normalized !== "ACTIVE" && normalized !== "APPROVED") {
      return [];
    }

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 3);

    const session = await this.api<{ id: string; status?: string }>("POST", "/v2/sessions", {
      consentId: consentRef,
      dataRange: { from: from.toISOString(), to: now.toISOString() },
      format: "json",
    });

    const maxAttempts = Number(process.env.SETU_FETCH_POLL_ATTEMPTS ?? 12);
    const delayMs = Number(process.env.SETU_FETCH_POLL_MS ?? 2500);

    for (let i = 0; i < maxAttempts; i++) {
      const fi = await this.api<{
        status?: string;
        fips?: unknown[];
        fiData?: unknown[];
      }>("GET", `/v2/sessions/${encodeURIComponent(session.id)}`);

      const st = (fi.status ?? "").toUpperCase();
      if (st === "COMPLETED" || st === "PARTIAL") {
        return parseSetuFiPayload(fi);
      }
      if (st === "FAILED" || st === "EXPIRED") {
        throw new Error(`Setu data session ${st} for consent ${consentRef}`);
      }
      await sleep(delayMs);
    }

    // Last attempt — return whatever we can parse (may be empty)
    const last = await this.api<unknown>("GET", `/v2/sessions/${encodeURIComponent(session.id)}`);
    return parseSetuFiPayload(last);
  }

  /** Persist holdings from Setu FI_DATA_READY webhook payload. */
  parseWebhookFiData(payload: unknown): TspHolding[] {
    return parseSetuFiPayload(payload);
  }
}

function mapSetuConsentStatus(status?: string): TspConsentResult["status"] {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "ACTIVE" || s === "APPROVED") return "active";
  if (s === "REVOKED") return "revoked";
  if (s === "EXPIRED") return "expired";
  return "pending";
}
