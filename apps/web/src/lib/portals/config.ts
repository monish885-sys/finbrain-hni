import type { PortalDefinition, PortalId, PortalRouteId } from "@capstone/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Gem,
  Shield,
  Zap,
  Sparkles,
  Eye,
  Hourglass,
  Users,
  Vault,
} from "lucide-react";

export interface PortalNavItem {
  routeId: PortalRouteId;
  segment: string;
  label: string;
  icon: LucideIcon;
  teaser?: boolean;
}

const ROUTE_META: Record<PortalRouteId, Omit<PortalNavItem, "routeId">> = {
  dashboard: { segment: "dashboard", label: "Daily Glance", icon: LayoutDashboard },
  wealth: { segment: "wealth", label: "God Mode", icon: Gem },
  firewall: { segment: "firewall", label: "Tax Firewall", icon: Shield },
  actions: { segment: "actions", label: "Action Cards", icon: Zap },
  architect: { segment: "architect", label: "ARCHITECT", icon: Sparkles },
  "honesty-check": { segment: "honesty-check", label: "Honesty Check", icon: Eye, teaser: true },
  "time-machine": { segment: "time-machine", label: "Time Machine", icon: Hourglass, teaser: true },
  vault: { segment: "vault", label: "Succession Vault", icon: Vault },
  clients: { segment: "clients", label: "Clients", icon: Users },
};

export const PORTALS: Record<PortalId, PortalDefinition> = {
  owner: {
    id: "owner",
    label: "Owner Portal",
    tagline: "Principal command layer",
    description: "Full family wealth, tax radar, Action Cards, and ARCHITECT — the complete command view.",
    persona: { name: "Rahul Sharma", subtitle: "PAN · ABCPR1234A", initial: "R" },
    badge: "Principal",
    routes: ["dashboard", "wealth", "firewall", "actions", "architect", "honesty-check", "time-machine"],
    scopeNote: "Full family visibility — you control consent for all other portals.",
  },
  family: {
    id: "family",
    label: "Family Portal",
    tagline: "Consent-scoped family view",
    description: "Shared net worth, emergency access, and family-safe ARCHITECT — no hidden surveillance.",
    persona: { name: "Priya Sharma", subtitle: "Spouse · Consent granted", initial: "P" },
    badge: "Family",
    routes: ["dashboard", "wealth", "vault", "architect"],
    scopeNote: "Shared by Rahul — joint accounts, trust summary, and emergency playbook only.",
  },
  investor: {
    id: "investor",
    label: "Investor Portal",
    tagline: "Family office CIO view",
    description: "Cross-entity allocation, manager scorecards, and portfolio-aware ARCHITECT.",
    persona: { name: "Arjun Mehta", subtitle: "Family Office CIO", initial: "A" },
    badge: "CIO",
    routes: ["dashboard", "wealth", "honesty-check", "architect"],
    scopeNote: "Investment book across entities — no tax ledger or personal banking credentials.",
  },
  ca: {
    id: "ca",
    label: "CA Portal",
    tagline: "Tax advisor workspace",
    description: "Client reconciliation, AIS mismatches, harvest memos, and export-ready tax packs.",
    persona: { name: "CA Vikram Desai", subtitle: "Rahul Family · FY 2025-26", initial: "V" },
    badge: "Advisor",
    routes: ["clients", "firewall", "actions", "architect"],
    scopeNote: "Tax and compliance scope only — Rahul granted read access via Advisor Mesh.",
  },
  rm: {
    id: "rm",
    label: "RM Portal",
    tagline: "Institution slice only",
    description: "HDFC book of business — never the full family picture. Held-away by design.",
    persona: { name: "Neha Kapoor", subtitle: "HDFC Private Banking", initial: "N" },
    badge: "RM",
    routes: ["dashboard", "wealth"],
    scopeNote: "HDFC accounts only (~24% of family wealth). Cannot see held-away assets.",
  },
  successor: {
    id: "successor",
    label: "Successor Portal",
    tagline: "Emergency playbook",
    description: "If I'm Gone vault, nominee audit, and step-by-step access instructions — trigger-gated.",
    persona: { name: "Priya Sharma", subtitle: "Successor · Standby", initial: "P" },
    badge: "Vault",
    routes: ["vault", "dashboard"],
    scopeNote: "Activated only by configured trigger. Not a will substitute.",
  },
};

export function getPortalNav(portalId: PortalId): PortalNavItem[] {
  const portal = PORTALS[portalId];
  return portal.routes.map((routeId) => ({
    routeId,
    ...ROUTE_META[routeId],
  }));
}

export function getPortalHomePath(portalId: PortalId): string {
  const first = PORTALS[portalId].routes[0];
  return `/${portalId}/${ROUTE_META[first].segment}`;
}

export function portalHasRoute(portalId: PortalId, routeId: PortalRouteId): boolean {
  return PORTALS[portalId].routes.includes(routeId);
}
