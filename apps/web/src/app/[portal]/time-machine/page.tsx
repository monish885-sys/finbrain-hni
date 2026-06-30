"use client";

import { demoData } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import {
  PageHeader,
  GlassCard,
  GlassCardTitle,
  PremiumBadge,
  GradientStatCard,
} from "@/components/premium";
import { formatINR } from "@capstone/ui";
import { Hourglass, Calendar } from "lucide-react";

export default function TimeMachinePage() {
  usePortalRoute("time-machine");
  const { time_machine: tm } = demoData;

  return (
    <PortalShell>
      <div className="space-y-8 max-w-4xl">
        <PageHeader
          eyebrow="Time Machine"
          title="Scenario Analysis"
          description="Model ₹5 crore decisions with tax comparison, trade-offs, and a compliance calendar."
          icon={<Hourglass className="h-7 w-7 text-accent-blue" />}
          badge={<PremiumBadge variant="gold">Coming Q3 2026</PremiumBadge>}
        />

        <PortalScopeBanner />

        <GlassCard shimmer>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Query</p>
          <p className="font-display text-xl font-medium mt-2">{tm.query}</p>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-3">
          <GradientStatCard
            variant="dark"
            label="Via Personal"
            value={formatINR(tm.tax_comparison.personal_tax_inr, { compact: true })}
            sublabel="Estimated tax"
          />
          <GradientStatCard
            variant="emerald"
            label="Via HUF"
            value={formatINR(tm.tax_comparison.huf_tax_inr, { compact: true })}
            sublabel="Estimated tax"
          />
          <GradientStatCard
            variant="gold"
            label="Savings"
            value={formatINR(tm.tax_comparison.savings_inr, { compact: true })}
            sublabel="Route via HUF"
          />
        </div>

        <GlassCard>
          <GlassCardTitle>Trade-offs</GlassCardTitle>
          <ul className="mt-4 space-y-3">
            {tm.trade_offs.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-accent-blue" />
            <GlassCardTitle>12-Month Compliance Calendar</GlassCardTitle>
          </div>
          <div className="space-y-2">
            {tm.calendar.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-border bg-white/[0.02] px-4 py-3.5"
              >
                <span className="text-xs font-semibold text-accent-blue shrink-0 w-20 uppercase tracking-wide">
                  {item.month}
                </span>
                <span className="text-sm">{item.action}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <p className="text-xs text-muted-foreground text-center">
          Every figure cites IT Act sections and state stamp duty schedules · Full Time Machine ships Phase 2
        </p>
      </div>
    </PortalShell>
  );
}
