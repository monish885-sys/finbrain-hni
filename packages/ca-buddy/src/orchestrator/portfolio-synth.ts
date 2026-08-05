import type { PortfolioContext } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";
import { matchSectorQuery } from "../context/portfolio";
import { formatCitations, formatInr, renderTemplate } from "./template-engine";

export function buildPortfolioAnswer(query: string, ctx: PortfolioContext): string {
  const { responseTemplates, sectorMap } = getBuddyConfig();
  const sectorMatch = matchSectorQuery(query);

  if (sectorMatch && ctx.sector_exposure?.[sectorMatch.sector_id] !== undefined) {
    const exposure = ctx.sector_exposure[sectorMatch.sector_id] ?? 0;
    const holdings = ctx.holdings_by_sector?.[sectorMatch.sector_id] ?? [];
    return renderTemplate(responseTemplates.portfolio_sector, {
      family_name: ctx.family_name,
      sector_label: sectorMatch.label,
      sector_holdings: holdings.map((h) => `• ${h}`).join("\n") || "• Holdings aggregated from entity graph",
      sector_value: formatInr(exposure),
      sector_pct:
        ctx.total_net_worth_inr > 0
          ? ((exposure / ctx.total_net_worth_inr) * 100).toFixed(1)
          : "0",
    });
  }

  const topN = sectorMap.portfolio_display.top_holdings_count;
  return renderTemplate(responseTemplates.portfolio_snapshot, {
    family_name: ctx.family_name,
    net_worth: formatInr(ctx.total_net_worth_inr),
    entity_count: ctx.entity_count,
    entities_summary: ctx.entities_summary.join(", "),
    firewall_status: ctx.firewall_status,
    open_mismatches: ctx.open_mismatches,
    top_holdings: ctx.holdings_summary.slice(0, topN).map((h) => `• ${h}`).join("\n"),
  });
}
