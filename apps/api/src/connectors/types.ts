export type ConnectorProvider = "upstox" | "zerodha" | "aa";

export type ConnectorCatalogItem = {
  provider: ConnectorProvider;
  label: string;
  kind: "broker_oauth" | "account_aggregator";
  description: string;
  configured: boolean;
  missing_env: string[];
};

export type OAuthStartResult = {
  provider: ConnectorProvider;
  redirect_url: string;
  state: string;
  connection_id: string;
  message?: string;
};

export type SyncedHolding = {
  symbol: string;
  name: string;
  quantity: number;
  averagePriceInr: number;
  lastPriceInr: number;
  pnlInr: number;
  exchange?: string;
  isin?: string;
};
