import { randomUUID } from "node:crypto";
import type { OAuthStartResult, SyncedHolding } from "./types";

const UPSTOX_AUTH = "https://api.upstox.com/v2/login/authorization/dialog";
const UPSTOX_TOKEN = "https://api.upstox.com/v2/login/authorization/token";
const UPSTOX_HOLDINGS = "https://api.upstox.com/v2/portfolio/long-term-holdings";

export function upstoxConfigured(): boolean {
  return Boolean(process.env.UPSTOX_API_KEY && process.env.UPSTOX_API_SECRET && process.env.UPSTOX_REDIRECT_URI);
}

export function upstoxMissingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.UPSTOX_API_KEY) missing.push("UPSTOX_API_KEY");
  if (!process.env.UPSTOX_API_SECRET) missing.push("UPSTOX_API_SECRET");
  if (!process.env.UPSTOX_REDIRECT_URI) missing.push("UPSTOX_REDIRECT_URI");
  return missing;
}

export function buildUpstoxAuthUrl(state: string): OAuthStartResult["redirect_url"] {
  const clientId = process.env.UPSTOX_API_KEY!;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${UPSTOX_AUTH}?${params.toString()}`;
}

export async function exchangeUpstoxCode(code: string): Promise<{
  access_token: string;
  extended_token?: string;
  user_id?: string;
  user_name?: string;
  email?: string;
}> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.UPSTOX_API_KEY!,
    client_secret: process.env.UPSTOX_API_SECRET!,
    redirect_uri: process.env.UPSTOX_REDIRECT_URI!,
    grant_type: "authorization_code",
  });

  const res = await fetch(UPSTOX_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as {
    access_token: string;
    extended_token?: string;
    user_id?: string;
    user_name?: string;
    email?: string;
  };
}

export async function fetchUpstoxHoldings(accessToken: string): Promise<SyncedHolding[]> {
  const res = await fetch(UPSTOX_HOLDINGS, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox holdings failed (${res.status}): ${text.slice(0, 200)}`);
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
      company_name?: string;
    }>;
  };
  return (json.data ?? []).map((h) => ({
    symbol: h.tradingsymbol ?? h.isin ?? `UNK_${randomUUID().slice(0, 6)}`,
    name: h.company_name ?? h.tradingsymbol ?? "Holding",
    quantity: h.quantity ?? 0,
    averagePriceInr: h.average_price ?? 0,
    lastPriceInr: h.last_price ?? h.average_price ?? 0,
    pnlInr: h.pnl ?? 0,
    exchange: h.exchange,
    isin: h.isin,
  }));
}
