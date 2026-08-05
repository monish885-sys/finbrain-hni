import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import type { DailyGlance, Family, FirewallData, Holding, PortfolioContext } from "@capstone/types";
import { buildPortfolioContext } from "./context/portfolio";
import { ask, askSync, type AskOptions } from "./orchestrator/ask";

export function getKapoorPortfolio(): PortfolioContext {
  return buildPortfolioContext({
    family: family as Family,
    holdings: holdings as Holding[],
    firewall: firewall as FirewallData,
    dailyGlance: dailyGlance as DailyGlance,
  });
}

export type AskDemoOptions = Omit<AskOptions, "portfolio"> & {
  /** When true, omit portfolio context entirely */
  withoutPortfolio?: boolean;
};

export function askDemoSync(query: string, options: AskDemoOptions = {}) {
  const { withoutPortfolio, ...rest } = options;
  return askSync(query, {
    ...rest,
    deterministic: rest.deterministic ?? true,
    portfolio: withoutPortfolio ? undefined : getKapoorPortfolio(),
  });
}

export async function askDemo(query: string, options: AskDemoOptions = {}) {
  const { withoutPortfolio, ...rest } = options;
  return ask(query, {
    ...rest,
    deterministic: rest.deterministic ?? true,
    portfolio: withoutPortfolio ? undefined : getKapoorPortfolio(),
  });
}
