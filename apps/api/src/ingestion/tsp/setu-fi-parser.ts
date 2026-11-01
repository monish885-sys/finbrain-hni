/**
 * Map Setu / ReBIT FI JSON (deposit, mutual funds, equities) → TspHolding[].
 * Never logs PAN / account numbers from FI payloads.
 */
import type { TspHolding } from "./types";

type Json = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v == null) return [];
  return [v as T];
}

function accountFromNode(node: Json): Json | null {
  if (node.account && typeof node.account === "object") return node.account as Json;
  if (node.type || node.Summary || node.summary) return node;
  return null;
}

function parseDeposit(account: Json, fipId: string, linkRef: string): TspHolding | null {
  const summary = (account.summary ?? account.Summary ?? {}) as Json;
  const balance = num(summary.currentBalance ?? summary.CurrentBalance);
  if (balance <= 0) return null;
  const masked = str(account.maskedAccNumber ?? account.MaskedAccNumber, "XXXX");
  const branch = str(summary.branch ?? summary.Branch, fipId);
  const id = `dep_${linkRef || masked}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
  return {
    id,
    symbol: masked.slice(-4) || "CASH",
    name: `${str(summary.type ?? summary.Type, "Savings")} · ${masked}`,
    assetType: "cash",
    custodian: branch || fipId || "bank",
    quantity: 1,
    currentValueInr: balance,
    costBasisInr: balance,
    gainLossInr: 0,
    gainType: "none",
    lots: [],
  };
}

function parseMutualFunds(account: Json, fipId: string, linkRef: string): TspHolding[] {
  const summary = (account.summary ?? account.Summary ?? {}) as Json;
  const holdings = asArray<Json>(
    summary.Holding ?? summary.holding ?? summary.Holdings ?? summary.holdings ?? account.Holding,
  );
  const out: TspHolding[] = [];

  if (holdings.length) {
    for (const h of holdings) {
      const units = num(h.closingUnits ?? h.ClosingUnits ?? h.units ?? h.quantity);
      const nav = num(h.nav ?? h.NAV ?? h.currentNav ?? h.closingNAV);
      const value = num(h.currentValue ?? h.CurrentValue ?? h.marketValue, units * nav);
      const cost = num(h.costValue ?? h.CostValue ?? h.investedValue, value);
      if (value <= 0 && units <= 0) continue;
      const isin = str(h.isin ?? h.ISIN, str(h.amfiCode ?? h.schemeCode, "MF"));
      const name = str(h.schemeName ?? h.SchemeName ?? h.name, isin);
      const id = `mf_${linkRef}_${isin}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
      out.push({
        id,
        symbol: isin,
        name,
        assetType: "mutual_fund",
        custodian: fipId || "mutual_fund",
        quantity: units || 1,
        currentValueInr: value || units * nav,
        costBasisInr: cost,
        gainLossInr: (value || units * nav) - cost,
        gainType: "ltcg",
        lots: [],
      });
    }
    return out;
  }

  const total = num(summary.currentValue ?? summary.CurrentValue ?? summary.totalValue);
  if (total > 0) {
    const masked = str(account.maskedAccNumber, "MF");
    out.push({
      id: `mf_${linkRef || masked}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
      symbol: masked.slice(-6) || "MF",
      name: str(summary.amc ?? summary.AMC, "Mutual funds"),
      assetType: "mutual_fund",
      custodian: fipId || "mutual_fund",
      quantity: 1,
      currentValueInr: total,
      costBasisInr: total,
      gainLossInr: 0,
      gainType: "ltcg",
      lots: [],
    });
  }
  return out;
}

function parseEquities(account: Json, fipId: string, linkRef: string): TspHolding[] {
  const summary = (account.summary ?? account.Summary ?? {}) as Json;
  const holdings = asArray<Json>(
    summary.Holding ?? summary.holding ?? summary.Holdings ?? summary.holdings ?? account.Holding,
  );
  const out: TspHolding[] = [];

  for (const h of holdings) {
    const qty = num(h.units ?? h.quantity ?? h.closingUnits ?? h.ClosingUnits);
    const last = num(h.lastTradedPrice ?? h.LTP ?? h.nav ?? h.rate ?? h.currentPrice);
    const value = num(h.currentValue ?? h.CurrentValue ?? h.marketValue, qty * last);
    const cost = num(h.costValue ?? h.CostValue ?? h.investedValue, value);
    if (qty <= 0 && value <= 0) continue;
    const symbol = str(h.isin ?? h.ISIN ?? h.symbol ?? h.Symbol, "EQ");
    const name = str(h.issuerName ?? h.IssuerName ?? h.companyName ?? h.name, symbol);
    const id = `eq_${linkRef}_${symbol}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
    out.push({
      id,
      symbol,
      name,
      assetType: "equity",
      custodian: fipId || "demat",
      quantity: qty || 1,
      currentValueInr: value || qty * last,
      costBasisInr: cost,
      gainLossInr: (value || qty * last) - cost,
      gainType: "stcg",
      lots: [],
    });
  }

  if (!out.length) {
    const total = num(summary.currentValue ?? summary.CurrentValue ?? summary.totalValue);
    if (total > 0) {
      const masked = str(account.maskedAccNumber, "EQ");
      out.push({
        id: `eq_${linkRef || masked}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64),
        symbol: masked.slice(-6) || "EQ",
        name: "Demat holdings",
        assetType: "equity",
        custodian: fipId || "demat",
        quantity: 1,
        currentValueInr: total,
        costBasisInr: total,
        gainLossInr: 0,
        gainType: "stcg",
        lots: [],
      });
    }
  }
  return out;
}

function parseAccount(account: Json, fipId: string, linkRef: string): TspHolding[] {
  const type = str(account.type ?? account.Type, "").toLowerCase();
  if (type.includes("deposit") || type === "savings" || type === "current") {
    const h = parseDeposit(account, fipId, linkRef);
    return h ? [h] : [];
  }
  if (type.includes("mutual") || type === "mf") {
    return parseMutualFunds(account, fipId, linkRef);
  }
  if (type.includes("equit") || type.includes("etf") || type.includes("demat")) {
    return parseEquities(account, fipId, linkRef);
  }
  // Heuristic fallbacks
  const deposit = parseDeposit(account, fipId, linkRef);
  if (deposit) return [deposit];
  const mf = parseMutualFunds(account, fipId, linkRef);
  if (mf.length) return mf;
  return parseEquities(account, fipId, linkRef);
}

/** Walk Setu session / auto-fetch payload shapes. */
export function parseSetuFiPayload(payload: unknown): TspHolding[] {
  const holdings: TspHolding[] = [];
  const root = (payload ?? {}) as Json;

  const fips = asArray<Json>(root.fips ?? root.fiData ?? root.FI ?? []);
  for (const fip of fips) {
    const fipId = str(fip.fipID ?? fip.fipId ?? fip.id, "fip");
    const accounts = asArray<Json>(fip.accounts ?? fip.data ?? []);
    for (const raw of accounts) {
      const linkRef = str(raw.linkRefNumber ?? raw.linkedAccRef, "");
      const decrypted = (raw.decryptedFI ?? raw.data ?? raw) as Json;
      const account = accountFromNode(decrypted);
      if (!account) continue;
      holdings.push(...parseAccount(account, fipId, linkRef));
    }
  }

  // Deduplicate by id
  const byId = new Map<string, TspHolding>();
  for (const h of holdings) byId.set(h.id, h);
  return [...byId.values()];
}
