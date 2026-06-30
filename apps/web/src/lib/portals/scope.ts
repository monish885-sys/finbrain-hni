import { demoData } from "@capstone/demo-data";
import type { PortalId } from "@capstone/types";
import type { ActionCard, Entity, Holding } from "@capstone/types";

const RM_CUSTODIAN_MATCH = /hdfc/i;
const FAMILY_ENTITY_IDS = new Set(["person_002", "trust_001"]);
const FAMILY_CUSTODIAN_MATCH = /icici|joint/i;

export interface PortalScope {
  label: string;
  netWorthInr: number;
  netWorthLabel: string;
  entities: Entity[];
  holdings: Holding[];
  actionCards: ActionCard[];
  showTaxMetrics: boolean;
  showHeldAway: boolean;
  showFirewall: boolean;
  heldAwayPct?: number;
  scopeBanner?: string;
}

export function getPortalScope(portalId: PortalId): PortalScope {
  const { family, holdings, action_cards } = demoData;

  switch (portalId) {
    case "owner":
      return {
        label: "Full family",
        netWorthInr: family.total_net_worth_inr,
        netWorthLabel: "Family Net Worth",
        entities: family.entities,
        holdings,
        actionCards: action_cards,
        showTaxMetrics: true,
        showHeldAway: true,
        showFirewall: true,
        heldAwayPct: family.held_away_pct,
      };

    case "family": {
      const scopedEntities = family.entities.filter(
        (e) => FAMILY_ENTITY_IDS.has(e.id) || e.id === "person_002"
      );
      const scopedHoldings = holdings.filter(
        (h) =>
          FAMILY_ENTITY_IDS.has(h.held_by_entity_id) ||
          FAMILY_CUSTODIAN_MATCH.test(h.custodian)
      );
      const spouseNw =
        family.entities.find((e) => e.id === "person_002")?.net_worth_inr ?? 0;
      const trustNw =
        family.entities.find((e) => e.id === "trust_001")?.net_worth_inr ?? 0;

      return {
        label: "Shared family view",
        netWorthInr: spouseNw + trustNw,
        netWorthLabel: "Shared Family Wealth",
        entities: scopedEntities.length ? scopedEntities : family.entities.slice(0, 2),
        holdings: scopedHoldings.length ? scopedHoldings : holdings.slice(0, 4),
        actionCards: action_cards.filter((c) => c.type === "nominee_fix"),
        showTaxMetrics: false,
        showHeldAway: false,
        showFirewall: false,
        scopeBanner: "Consent-scoped view — Rahul granted spouse access to joint and trust accounts.",
      };
    }

    case "investor":
      return {
        label: "Investment book",
        netWorthInr: family.total_net_worth_inr,
        netWorthLabel: "Investable Assets",
        entities: family.entities.filter((e) => e.type !== "pvt_ltd"),
        holdings: holdings.filter((h) => h.asset_type !== "fd"),
        actionCards: action_cards.filter((c) =>
          ["harvest", "manager_alert"].includes(c.type)
        ),
        showTaxMetrics: false,
        showHeldAway: true,
        showFirewall: false,
        heldAwayPct: family.held_away_pct,
        scopeBanner: "CIO view — allocation and manager performance across entities.",
      };

    case "ca":
      return {
        label: "Tax scope",
        netWorthInr: family.total_net_worth_inr,
        netWorthLabel: "Client · Rahul Family",
        entities: family.entities,
        holdings,
        actionCards: action_cards.filter((c) =>
          ["harvest", "firewall_fix", "advance_tax"].includes(c.type)
        ),
        showTaxMetrics: true,
        showHeldAway: false,
        showFirewall: true,
        scopeBanner: "Advisor Mesh — tax ledger and reconciliation exports only.",
      };

    case "rm": {
      const rmHoldings = holdings.filter((h) => RM_CUSTODIAN_MATCH.test(h.custodian));
      const rmNw = rmHoldings.reduce((sum, h) => sum + h.current_value_inr, 0);

      return {
        label: "HDFC slice",
        netWorthInr: rmNw || Math.round(family.total_net_worth_inr * 0.24),
        netWorthLabel: "HDFC Book",
        entities: family.entities.filter((e) => e.id === "person_001"),
        holdings: rmHoldings.length ? rmHoldings : holdings.filter((h) => h.custodian === "HDFC"),
        actionCards: [],
        showTaxMetrics: false,
        showHeldAway: false,
        showFirewall: false,
        scopeBanner: "RM view — HDFC accounts only. 76% of family wealth is held away.",
      };
    }

    case "successor":
      return {
        label: "Emergency scope",
        netWorthInr: family.total_net_worth_inr,
        netWorthLabel: "Family Estate Overview",
        entities: family.entities,
        holdings: holdings.slice(0, 3),
        actionCards: action_cards.filter((c) => c.type === "nominee_fix"),
        showTaxMetrics: false,
        showHeldAway: false,
        showFirewall: false,
        scopeBanner: "Successor standby — vault and playbook access when trigger activates.",
      };
  }
}
