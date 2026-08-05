/**
 * Zerodha Kite Connect — OAuth login redirect + holdings.
 * Requires KITE_API_KEY + KITE_API_SECRET + KITE_REDIRECT_URI from developers.kite.trade
 */
import type { SyncedHolding } from "./types";

const KITE_LOGIN = "https://kite.zerodha.com/connect/login";
const KITE_SESSION = "https://api.kite.trade/session/token";
const KITE_HOLDINGS = "https://api.kite.trade/portfolio/holdings";

export function zerodhaConfigured(): boolean {
  return Boolean(process.env.KITE_API_KEY && process.env.KITE_API_SECRET && process.env.KITE_REDIRECT_URI);
}

export function zerodhaMissingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.KITE_API_KEY) missing.push("KITE_API_KEY");
  if (!process.env.KITE_API_SECRET) missing.push("KITE_API_SECRET");
  if (!process.env.KITE_REDIRECT_URI) missing.push("KITE_REDIRECT_URI");
  return missing;
}

export function buildZerodhaAuthUrl(state: string): string {
  const apiKey = process.env.KITE_API_KEY!;
  // Kite returns request_token; we encode state in redirect via our callback query
  return `${KITE_LOGIN}?v=3&api_key=${encodeURIComponent(apiKey)}&redirect_params=${encodeURIComponent(`state=${state}`)}`;
}

export async function exchangeZerodhaToken(requestToken: string): Promise<{
  access_token: string;
  user_id?: string;
  user_name?: string;
  email?: string;
}> {
  const crypto = await import("node:crypto");
  const apiKey = process.env.KITE_API_KEY!;
  const apiSecret = process.env.KITE_API_SECRET!;
  const checksum = crypto.createHash("sha256").update(apiKey + requestToken + apiSecret).digest("hex");

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });

  const res = await fetch(KITE_SESSION, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zerodha session failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: { access_token: string; user_id?: string; user_name?: string; email?: string };
  };
  if (!json.data?.access_token) throw new Error("Zerodha session missing access_token");
  return json.data;
}

export async function fetchZerodhaHoldings(accessToken: string): Promise<SyncedHolding[]> {
  const apiKey = process.env.KITE_API_KEY!;
  const res = await fetch(KITE_HOLDINGS, {
    headers: {
      Authorization: `token ${apiKey}:${accessToken}`,
      "X-Kite-Version": "3",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zerodha holdings failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      tradingsymbol?: string;
      isin?: string;
      quantity?: number;
      average_price?: number;
      last_price?: number;
      pnl?: number;
      exchange?: string;
    }>;
  };
  return (json.data ?? []).map((h) => ({
    symbol: h.tradingsymbol ?? h.isin ?? "UNK",
    name: h.tradingsymbol ?? "Holding",
    quantity: h.quantity ?? 0,
    averagePriceInr: h.average_price ?? 0,
    lastPriceInr: h.last_price ?? h.average_price ?? 0,
    pnlInr: h.pnl ?? 0,
    exchange: h.exchange,
    isin: h.isin,
  }));
}
