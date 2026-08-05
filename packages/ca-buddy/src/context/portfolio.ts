import type { DailyGlance, Family, FirewallData, Holding, Lot } from "@capstone/types";
import type { HarvestLot, PortfolioContext } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";

export interface PortfolioBuildInput {
  family: Family;
  holdings: Holding[];
  firewall: FirewallData;
  dailyGlance?: DailyGlance;
}

export function buildPortfolioContext(input: PortfolioBuildInput): PortfolioContext {
  const { family, holdings, firewall, dailyGlance } = input;
  const { sectorMap } = getBuddyConfig();

  const entitiesSummary = family.entities.map((e) => `${e.name} (${e.type})`);
  const holdingsSummary = [...holdings]
    .sort((a, b) => b.current_value_inr - a.current_value_inr)
    .map((h) => `${h.symbol} ₹${(h.current_value_inr / 100_000).toFixed(1)}L (${h.held_by_entity_id})`);

  const sectorExposure: Record<string, number> = {};
  const holdingsBySector: Record<string, string[]> = {};

  for (const rule of sectorMap.sector_rules) {
    holdingsBySector[rule.sector_id] = [];
    let exposure = 0;

    for (const h of holdings) {
      if (rule.asset_types?.includes(h.asset_type)) {
        exposure += h.current_value_inr;
        holdingsBySector[rule.sector_id].push(`${h.symbol} ₹${(h.current_value_inr / 100_000).toFixed(1)}L`);
        continue;
      }
      if (rule.holding_patterns?.some((p) => matchesPattern(h.symbol, p) || matchesPattern(h.name, p))) {
        exposure += h.current_value_inr;
        holdingsBySector[rule.sector_id].push(`${h.symbol} ₹${(h.current_value_inr / 100_000).toFixed(1)}L`);
      }
    }
    if (exposure > 0) sectorExposure[rule.sector_id] = exposure;
  }

  const harvestLots: HarvestLot[] = [];
  for (const h of holdings) {
    for (const lot of h.lots ?? []) {
      if (lot.gain_type === "stcg" || lot.gain_type === "ltcg") {
        harvestLots.push({
          lot_id: lot.lot_id,
          symbol: h.symbol,
          gain_loss_inr: lot.gain_loss_inr,
          gain_type: lot.gain_type,
        });
      }
    }
  }

  const propertyAssets = holdings
    .filter((h) => h.asset_type === "re")
    .map((h) => ({
      name: h.name,
      value_inr: h.current_value_inr,
      cost_inr: h.cost_basis_inr,
      purchase_date: oldestLotDate(h.lots),
    }));

  return {
    family_name: family.name,
    total_net_worth_inr: family.total_net_worth_inr,
    entity_count: family.entity_count,
    entities_summary: entitiesSummary,
    holdings_summary: holdingsSummary,
    firewall_status: firewall.status.status,
    open_mismatches: firewall.status.needs_attention,
    sector_exposure: sectorExposure,
    holdings_by_sector: holdingsBySector,
    harvest_lots: harvestLots,
    property_assets: propertyAssets,
    tax_signals: dailyGlance
      ? {
          advance_tax_amount_inr: dailyGlance.advance_tax_amount_inr,
          advance_tax_due_days: dailyGlance.advance_tax_due_days,
          projected_total_tax_inr: dailyGlance.advance_tax_amount_inr,
          as_of_date: new Date().toISOString().slice(0, 10),
        }
      : undefined,
    estimated_gross_income_inr: Math.round(
      family.total_net_worth_inr * getBuddyConfig().runtime.defaults.gross_income_factor_of_networth,
    ),
    old_regime_deductions_inr: getBuddyConfig().runtime.defaults.old_regime_deductions_inr,
    nominee_gaps: family.nominee_gaps,
  };
}

function matchesPattern(text: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(text);
}

function oldestLotDate(lots: Lot[]): string | undefined {
  if (!lots?.length) return undefined;
  return lots.reduce((oldest, lot) => (lot.buy_date < oldest ? lot.buy_date : oldest), lots[0].buy_date);
}

export function matchSectorQuery(query: string): { sector_id: string; label: string } | null {
  const { sectorMap } = getBuddyConfig();
  for (const rule of sectorMap.sector_rules) {
    if (rule.query_patterns.some((p) => new RegExp(p, "i").test(query))) {
      return { sector_id: rule.sector_id, label: rule.label };
    }
  }
  return null;
}
