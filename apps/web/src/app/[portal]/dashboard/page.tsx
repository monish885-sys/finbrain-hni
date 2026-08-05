"use client";

import Link from "next/link";
import { demoData, getPendingActionCards } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import {
  PageHeader,
  GradientStatCard,
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  ProgressBar,
  PremiumBadge,
  EntityIcon,
} from "@/components/premium";
import { formatINR, formatRelativeTime } from "@capstone/ui";
import {
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@capstone/ui";
import { usePortalHref } from "@/hooks/use-portal-href";
import { getPortalScope } from "@/lib/portals";
import { useLiveWealth } from "@/hooks/use-live-wealth";

type Tab = "entities" | "assets" | "activity";

export default function DashboardPage() {
  const portalId = usePortalRoute("dashboard");
  const href = usePortalHref();
  const scope = getPortalScope(portalId);
  const live = useLiveWealth();
  const { daily_glance } = demoData;
  const family = live.family;
  const firewall = live.firewall;
  const pendingCards = (
    live.mode === "live" || live.mode === "empty"
      ? live.actionCards.filter((c) => c.status === "pending")
      : getPendingActionCards()
  ).filter((c) => live.mode === "live" || live.mode === "empty" || scope.actionCards.some((s) => s.id === c.id));
  const [tab, setTab] = useState<Tab>("entities");

  const firewallStatus =
    scope.showFirewall && firewall.status.needs_attention > 0 ? "attention" : "clean";
  const totalNw =
    live.mode === "live" || live.mode === "empty" ? family.total_net_worth_inr : scope.netWorthInr;

  const assetSegments = [
    { label: "Equity", value: family.asset_classes.equity, color: "bg-blue-500" },
    { label: "Debt", value: family.asset_classes.debt, color: "bg-emerald-500" },
    { label: "Real Estate", value: family.asset_classes.re, color: "bg-amber-500" },
    { label: "Alts", value: family.asset_classes.alts, color: "bg-violet-500" },
    { label: "Cash", value: family.asset_classes.cash, color: "bg-slate-500" },
  ];

  return (
    <PortalShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Daily Glance"
          title={scope.netWorthLabel}
          description="Your 30-second command summary — wealth, tax, and action in one view."
        />

        {live.mode === "live" && (
          <p className="text-xs text-emerald-400/90">Live API — net worth from your connected accounts</p>
        )}
        {live.mode === "empty" && (
          <div className="rounded-xl border border-border bg-white/5 p-4 text-sm">
            <p className="font-medium">Connect accounts to see net worth</p>
            <p className="text-muted-foreground mt-1">
              No holdings yet.{" "}
              <Link href="/onboarding/connect" className="text-accent-blue hover:underline">
                Add AA, CAS, or manual accounts
              </Link>
              .
            </p>
            {live.error && <p className="text-xs text-red-400 mt-2">{live.error}</p>}
          </div>
        )}
        {live.mode === "demo" && live.error && (
          <p className="text-xs text-muted-foreground">Demo fixtures (API fallback)</p>
        )}
        {live.mode === "demo" && !live.error && (
          <p className="text-xs text-muted-foreground">Demo mode — Kapoor sample data</p>
        )}

        <PortalScopeBanner />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <GradientStatCard
            variant="primary"
            label={scope.netWorthLabel}
            value={formatINR(totalNw, { compact: true })}
            sublabel={
              <>
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                <span className="text-emerald-300 font-medium">
                  {formatINR(family.delta_today_inr, { compact: true, showSign: true })} today
                </span>
              </>
            }
          />
          {scope.showTaxMetrics && (
            <GradientStatCard
              variant="gold"
              label="Tax Saved YTD"
              value={formatINR(family.tax_saved_ytd_inr, { compact: true })}
              sublabel={
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>Legal optimization</span>
                </>
              }
            />
          )}
          {scope.showFirewall && (
            <GradientStatCard
              variant="dark"
              label="Tax Firewall"
              value={
                <span className={firewallStatus === "clean" ? "text-emerald-400" : "text-amber-400"}>
                  {firewallStatus === "clean" ? "Clean" : `${firewall.status.needs_attention} alerts`}
                </span>
              }
              sublabel={`Last scan ${formatRelativeTime(firewall.status.last_scan)}`}
              icon={
                firewallStatus === "clean" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                )
              }
            />
          )}
          {scope.actionCards.length > 0 && (
            <GradientStatCard
              variant="dark"
              label="Action Cards"
              value={
                <span className="text-amber-400">{pendingCards.length} pending</span>
              }
              sublabel="Harvest & compliance"
              icon={<Zap className="h-5 w-5 text-amber-400" />}
            />
          )}
        </div>

        {pendingCards.length > 0 && (
          <GlassCard shimmer className="border-amber-500/20 bg-amber-500/5">
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <GlassCardTitle>Action Cards Need Attention</GlassCardTitle>
                    <GlassCardDescription>Ranked by tax impact and deadline</GlassCardDescription>
                  </div>
                </div>
                <PremiumBadge variant="danger" pulse>
                  {pendingCards.length}
                </PremiumBadge>
              </div>
            </GlassCardHeader>
            <div className="space-y-3">
              {pendingCards.slice(0, 2).map((card) => (
                <Link
                  key={card.id}
                  href={href(`actions/${card.id}`)}
                  className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] p-4 hover:border-accent-blue/30 hover:bg-white/[0.04] transition-all group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PremiumBadge variant={card.type === "harvest" ? "gold" : "warning"}>
                        {card.type === "harvest" ? "Free Money" : card.type.replace("_", " ")}
                      </PremiumBadge>
                    </div>
                    <p className="font-medium text-foreground">{card.title}</p>
                    <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {card.savings_inr > 0 && (
                      <span className="font-display text-lg font-semibold text-gold tabular-nums">
                        {formatINR(card.savings_inr, { compact: true })}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-blue transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {scope.showTaxMetrics && (
            <GlassCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Advance Tax
                  </p>
                  <p className="font-display text-2xl font-semibold mt-2 tabular-nums">
                    {formatINR(daily_glance.advance_tax_amount_inr, { compact: true })}
                  </p>
                  <p className="text-sm text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Due in {daily_glance.advance_tax_due_days} days
                  </p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <ProgressBar value={65} className="mt-4" />
              <p className="text-xs text-muted-foreground mt-2">65% of annual liability paid</p>
            </GlassCard>
          )}

          {scope.showHeldAway && (
            <GlassCard>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Held-Away
              </p>
              <p className="font-display text-3xl font-semibold mt-2 tabular-nums">
                {scope.heldAwayPct ?? family.held_away_pct}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Outside {family.primary_bank} — RM sees only 24%
              </p>
            </GlassCard>
          )}

          <GlassCard>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nominee Gaps
            </p>
            <p className="font-display text-3xl font-semibold mt-2 text-amber-400 tabular-nums">
              {family.nominee_gaps}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Accounts need update</p>
          </GlassCard>
        </div>

        <GlassCard padding="none" className="overflow-hidden">
          <div className="flex border-b border-border">
            {(
              [
                { id: "entities" as const, label: "By Entity" },
                { id: "assets" as const, label: "Asset Allocation" },
                { id: "activity" as const, label: "Recent Activity" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 px-4 py-3.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "text-foreground border-b-2 border-accent-blue bg-white/[0.02]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-6">
            {tab === "entities" && (
              <div className="space-y-5">
                {scope.entities.map((entity) => {
                  const pct = (entity.net_worth_inr / totalNw) * 100;
                  return (
                    <div key={entity.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <EntityIcon type={entity.type} />
                          <div>
                            <p className="font-medium text-foreground">{entity.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {entity.type.replace("_", " ")} · {pct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <p className="font-display text-lg font-semibold tabular-nums">
                          {formatINR(entity.net_worth_inr, { compact: true })}
                        </p>
                      </div>
                      <ProgressBar value={pct} barClassName="from-violet-500 to-purple-500" />
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "assets" && (
              <div className="space-y-5">
                {assetSegments.map((asset) => (
                  <div key={asset.label}>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", asset.color)} />
                        <span className="font-medium">{asset.label}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{asset.value}%</span>
                    </div>
                    <ProgressBar
                      value={asset.value}
                      barClassName={asset.color.replace("bg-", "from-") + " to-opacity-80"}
                    />
                  </div>
                ))}
              </div>
            )}

            {tab === "activity" && (
              <div className="space-y-4">
                {[
                  { date: "Today", event: "Portfolio rebalanced", change: "+₹2.1L", positive: true },
                  { date: "Yesterday", event: "HDFC dividend credited", change: "+₹85K", positive: true },
                  { date: "3 days ago", event: "Tax harvest executed", change: "Saved ₹1.2L", positive: true },
                  { date: "5 days ago", event: "HUF rental received", change: "+₹1.3L", positive: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between border-l-2 border-accent-blue/40 pl-4 py-1"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        item.positive && "text-emerald-400"
                      )}
                    >
                      {item.change}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </PortalShell>
  );
}
