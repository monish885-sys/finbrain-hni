/** Advisor Mesh portal identities — permissioned views per role */
export type PortalId = "owner" | "family" | "investor" | "ca" | "rm" | "successor";

export type PortalRouteId =
  | "dashboard"
  | "wealth"
  | "firewall"
  | "actions"
  | "architect"
  | "honesty-check"
  | "time-machine"
  | "vault"
  | "clients";

export interface PortalPersona {
  name: string;
  subtitle: string;
  initial: string;
}

export interface PortalDefinition {
  id: PortalId;
  label: string;
  tagline: string;
  description: string;
  persona: PortalPersona;
  badge: string;
  routes: PortalRouteId[];
  /** Consent / scope note shown in portal picker */
  scopeNote: string;
}

export const PORTAL_IDS: PortalId[] = ["owner", "family", "investor", "ca", "rm", "successor"];

export function isPortalId(value: string): value is PortalId {
  return (PORTAL_IDS as string[]).includes(value);
}
