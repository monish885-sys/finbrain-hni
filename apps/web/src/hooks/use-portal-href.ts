"use client";

import { usePathname } from "next/navigation";
import type { PortalId } from "@capstone/types";
import { getPortalFromPathname, portalPath } from "@/lib/portals";

export function usePortalId(): PortalId {
  const pathname = usePathname();
  return getPortalFromPathname(pathname) ?? "owner";
}

export function usePortalHref() {
  const portalId = usePortalId();
  return (segment: string) => portalPath(portalId, segment);
}
