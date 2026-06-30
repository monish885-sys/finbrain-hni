import { isPortalId, type PortalId } from "@capstone/types";
import { getPortalHomePath } from "./config";

export function portalPath(portalId: PortalId, segment: string): string {
  const clean = segment.replace(/^\//, "");
  return `/${portalId}/${clean}`;
}

export function getPortalFromPathname(pathname: string): PortalId | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && isPortalId(segment) ? segment : null;
}

export function getDefaultAuthenticatedPath(): string {
  return "/portals";
}

export function resolvePortalHome(portalId: PortalId): string {
  return getPortalHomePath(portalId);
}
