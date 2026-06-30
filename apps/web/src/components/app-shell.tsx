import { PortalShell } from "@/components/portal-shell";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
