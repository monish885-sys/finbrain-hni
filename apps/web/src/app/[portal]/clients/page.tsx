"use client";

import Link from "next/link";
import { demoData } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import {
  PageHeader,
  GradientStatCard,
  GlassCard,
  GlassCardTitle,
  GlassCardDescription,
  PremiumBadge,
} from "@/components/premium";
import { formatINR, formatRelativeTime } from "@capstone/ui";
import { Users, Shield, FileDown, ChevronRight } from "lucide-react";
import { usePortalHref } from "@/hooks/use-portal-href";
import { generateCAExportPDF } from "@/lib/pdf-export";

export default function ClientsPage() {
  usePortalRoute("clients");
  const href = usePortalHref();
  const { family, firewall, daily_glance } = demoData;

  return (
    <PortalShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Advisor Mesh"
          title="Client Workspace"
          description="Permissioned tax and compliance view — audit trail on every export."
          icon={<Users className="h-7 w-7 text-amber-400" />}
          badge={<PremiumBadge variant="gold">CA Access</PremiumBadge>}
        />

        <PortalScopeBanner />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GradientStatCard variant="primary" label="Active clients" value={1} sublabel="Rahul Family" />
          <GradientStatCard
            variant="dark"
            label="Firewall alerts"
            value={firewall.status.needs_attention}
            sublabel={`Last scan ${formatRelativeTime(firewall.status.last_scan)}`}
            icon={<Shield className="h-5 w-5 text-amber-400" />}
          />
          <GradientStatCard
            variant="gold"
            label="Pending actions"
            value={daily_glance.action_cards_pending}
            sublabel="Harvest & compliance"
          />
        </div>

        <GlassCard shimmer className="border-amber-500/15">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <GlassCardTitle>{family.name}</GlassCardTitle>
              <GlassCardDescription>
                FY 2025-26 · {family.entity_count} entities · Consent granted 12 Jun 2026
              </GlassCardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                Net worth {formatINR(family.total_net_worth_inr, { compact: true })} · Tax saved YTD{" "}
                {formatINR(family.tax_saved_ytd_inr, { compact: true })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => generateCAExportPDF()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10"
              >
                <FileDown className="h-4 w-4" />
                Export memo
              </button>
              <Link
                href={href("firewall")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2.5 text-sm font-medium text-white"
              >
                Open firewall
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardTitle>Quick links</GlassCardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Tax Firewall", desc: "AIS reconciliation", path: "firewall" },
              { label: "Action Cards", desc: "Harvest & fixes", path: "actions" },
              { label: "ARCHITECT", desc: "Citation-backed Q&A", path: "architect" },
            ].map((item) => (
              <Link
                key={item.path}
                href={href(item.path)}
                className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-4 py-3 hover:border-accent-blue/30 transition-colors group"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-blue" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </PortalShell>
  );
}
