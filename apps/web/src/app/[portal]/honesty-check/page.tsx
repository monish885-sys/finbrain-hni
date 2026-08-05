"use client";

import { demoData } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import {
  PageHeader,
  GlassCard,
  GlassCardTitle,
  GlassCardDescription,
  PremiumBadge,
  ProgressBar,
} from "@/components/premium";
import { formatINR } from "@capstone/ui";
import { Eye, TrendingUp, TrendingDown } from "lucide-react";

export default function HonestyCheckPage() {
  usePortalRoute("honesty-check");
  const { honesty_check: data } = demoData;

  return (
    <PortalShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Honesty Check"
          title="Manager Scorecard"
          description="Institution-neutral view across all wealth managers — overlap, fees, and performance."
          icon={<Eye className="h-7 w-7 text-gold" />}
          badge={<PremiumBadge variant="gold">Coming Q3 2026</PremiumBadge>}
        />

        <PortalScopeBanner />

        <GlassCard className="border-gold/15 bg-gold-muted/20">
          <p className="text-sm text-muted-foreground">
            Phase 2 preview — rankings and alerts use Kapoor family sample data from the Project Bible.
          </p>
        </GlassCard>

        <div className="space-y-4">
          {data.alerts.map((alert, i) => (
            <GlassCard key={i} className="border-amber-500/20">
              <p className="font-display text-lg font-semibold text-amber-400/90">{alert.title}</p>
              <p className="text-sm text-muted-foreground mt-2">{alert.description}</p>
              {alert.cost_inr && (
                <p className="text-sm text-red-400 mt-3 tabular-nums font-medium">
                  Duplicate fee cost · ~{formatINR(alert.cost_inr)}/year
                </p>
              )}
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <GlassCardTitle>PMS Ranking</GlassCardTitle>
          <GlassCardDescription>12 months, after fees vs Nifty 50</GlassCardDescription>
          <div className="mt-6 space-y-2">
            {data.pms_rankings.map((pms, i) => (
              <div
                key={pms.name}
                className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-4 py-3.5"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <p className="font-medium">{pms.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pms.status === "outperformer" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span
                    className={`font-semibold tabular-nums ${
                      pms.vs_benchmark_pct >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {pms.vs_benchmark_pct >= 0 ? "+" : ""}
                    {pms.vs_benchmark_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardTitle>Wallet Share</GlassCardTitle>
          <GlassCardDescription>Distribution across institutions</GlassCardDescription>
          <div className="mt-6 space-y-4">
            {data.wallet_share.map((w, i) => (
              <ProgressBar
                key={w.institution}
                label={w.institution}
                rightLabel={`${w.pct}%`}
                value={w.pct}
                barClassName={
                  i === 0
                    ? "from-blue-500 to-blue-600"
                    : i === 1
                      ? "from-emerald-500 to-emerald-600"
                      : "from-violet-500 to-purple-600"
                }
              />
            ))}
          </div>
          <p className="text-sm text-amber-400/80 mt-6 font-medium">61% held-away from primary RM</p>
        </GlassCard>
      </div>
    </PortalShell>
  );
}
