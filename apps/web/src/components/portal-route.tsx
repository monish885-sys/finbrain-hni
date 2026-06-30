"use client";

import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import type { PortalRouteId } from "@capstone/types";
import { usePortalId } from "@/hooks/use-portal-href";
import { getPortalScope, portalHasRoute } from "@/lib/portals";

export function usePortalRoute(routeId: PortalRouteId) {
  const portalId = usePortalId();
  if (!portalHasRoute(portalId, routeId)) {
    notFound();
  }
  return portalId;
}

export function PortalScopeBanner() {
  const portalId = usePortalId();
  const scope = getPortalScope(portalId);
  if (!scope.scopeBanner) return null;

  return (
    <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3 flex items-start gap-3">
      <Shield className="h-4 w-4 text-accent-blue shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">{scope.scopeBanner}</p>
    </div>
  );
}
