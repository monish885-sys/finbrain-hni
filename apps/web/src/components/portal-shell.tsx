"use client";

import { PortalLayout } from "@/components/layout/portal-layout";
import { usePortalId } from "@/hooks/use-portal-href";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const portalId = usePortalId();
  return <PortalLayout portalId={portalId}>{children}</PortalLayout>;
}

/** @deprecated Use PortalShell — kept for gradual migration */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
