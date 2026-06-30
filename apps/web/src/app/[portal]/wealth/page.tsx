"use client";

import { demoData, getEntityName } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import { getPortalScope } from "@/lib/portals";
import { NetWorthChart } from "@/components/net-worth-chart";
import {
  PageHeader,
  GradientStatCard,
  GlassCard,
  GlassCardTitle,
  GlassCardDescription,
  SegmentedProgress,
  PremiumBadge,
  EntityIcon,
} from "@/components/premium";
import { formatINR, formatRelativeTime } from "@capstone/ui";
import { AlertTriangle, TrendingUp, Building2, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const CHART_COLORS = ["#4f7cff", "#34d399", "#d4a853", "#8b5cf6", "#64748b"];

const accounts = [
  { institution: "HDFC Bank", type: "Savings", balance: 0.85, lastSync: "4 hours ago" },
  { institution: "Zerodha", type: "Demat", balance: 8.4, lastSync: "2 hours ago" },
  { institution: "Groww", type: "Mutual Funds", balance: 3.8, lastSync: "1 hour ago" },
  { institution: "Marcellus PMS", type: "PMS", balance: 12.5, lastSync: "6 hours ago" },
  { institution: "ICICI Bank", type: "Joint Account", balance: 0.8, lastSync: "3 hours ago" },
  { institution: "Kotak AIF", type: "AIF", balance: 20.0, lastSync: "12 hours ago" },
];

export default function WealthPage() {
  const portalId = usePortalRoute("wealth");
  const scope = getPortalScope(portalId);
  const { family, net_worth_history } = demoData;
  const holdings = scope.holdings;
  const entities = scope.entities;
  const { asset_classes } = family;

  const scopedAccounts = accounts.filter((a) =>
    holdings.some((h) => h.custodian.toLowerCase().includes(a.institution.split(" ")[0].toLowerCase()))
  );
  const displayAccounts = scopedAccounts.length ? scopedAccounts : accounts.slice(0, 3);

  const pieData = [
    { name: "Equity", value: asset_classes.equity },
    { name: "Debt", value: asset_classes.debt },
    { name: "Real Estate", value: asset_classes.re },
    { name: "Alts", value: asset_classes.alts },
    { name: "Cash", value: asset_classes.cash },
  ];

  const assetSegments = [
    { label: "Equity", value: asset_classes.equity, color: "bg-blue-500" },
    { label: "Debt", value: asset_classes.debt, color: "bg-emerald-500" },
    { label: "Real Estate", value: asset_classes.re, color: "bg-amber-500" },
    { label: "Alts", value: asset_classes.alts, color: "bg-violet-500" },
    { label: "Cash", value: asset_classes.cash, color: "bg-slate-500" },
  ];

  return (
    <PortalShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="God Mode"
          title={scope.label === "HDFC slice" ? "HDFC Wealth View" : "Family Wealth Dashboard"}
          description="All accounts, entities, and asset types — unified in real time."
          badge={<PremiumBadge variant="gold">Live Demo</PremiumBadge>}
        />

        <PortalScopeBanner />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <GradientStatCard
            variant="primary"
            label="Total Net Worth"
            value={formatINR(scope.netWorthInr, { compact: true })}
            sublabel={
              <span className="text-emerald-300">
                {formatINR(family.delta_month_inr, { compact: true, showSign: true })} this month
              </span>
            }
          />
          <GradientStatCard
            variant="emerald"
            label="Entities Tracked"
            value={entities.length}
            sublabel="Individual · HUF · Trust · RE"
            icon={<Building2 className="h-5 w-5 text-white/70" />}
          />
          {scope.showHeldAway && (
            <GradientStatCard
              variant="dark"
              label="Held-Away"
              value={`${family.held_away_pct}%`}
              sublabel={`Outside ${family.primary_bank}`}
              icon={<TrendingUp className="h-5 w-5 text-amber-400" />}
            />
          )}
          <GradientStatCard
            variant="dark"
            label="Last Sync"
            value={formatRelativeTime(family.last_sync)}
            sublabel="Auto-sync enabled"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          />
        </div>

        {scope.showHeldAway && (
        <GlassCard shimmer className="border-amber-500/15">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-400/90">
                {family.held_away_pct}% of wealth is held-away from your primary bank
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Your {family.primary_bank} RM sees only 24% of your portfolio. CAPSTONE aggregates{" "}
                {holdings.length} holdings across {displayAccounts.length} institutions.
              </p>
            </div>
          </div>
        </GlassCard>
        )}

        <GlassCard>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            12-Month Trend
          </p>
          <div className="h-24">
            <NetWorthChart data={net_worth_history} className="w-full h-full" />
          </div>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <GlassCardTitle>Wealth by Entity</GlassCardTitle>
            <GlassCardDescription>Family structure breakdown</GlassCardDescription>
            <div className="mt-6 space-y-5">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <EntityIcon type={entity.type} />
                    <div>
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {entity.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-lg font-semibold tabular-nums">
                    {formatINR(entity.net_worth_inr, { compact: true })}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <GlassCardTitle>Asset Allocation</GlassCardTitle>
            <GlassCardDescription>Portfolio composition</GlassCardDescription>
            <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
              <div className="w-44 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0f121c",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [`${value}%`, "Allocation"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full">
                <SegmentedProgress segments={assetSegments} />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Connected accounts */}
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <GlassCardTitle>Connected Accounts</GlassCardTitle>
              <GlassCardDescription>All linked institutions</GlassCardDescription>
            </div>
            {scope.showHeldAway && (
              <PremiumBadge variant="warning">{family.held_away_pct}% Held-Away</PremiumBadge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayAccounts.map((account) => (
              <div
                key={account.institution}
                className="rounded-xl border border-border bg-white/[0.02] p-4 hover:border-accent-blue/25 transition-colors"
              >
                <p className="font-semibold">{account.institution}</p>
                <p className="text-xs text-muted-foreground">{account.type}</p>
                <p className="font-display text-xl font-semibold mt-3 tabular-nums">
                  ₹{account.balance} Cr
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Sync: {account.lastSync}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Holdings table */}
        <GlassCard padding="none" className="overflow-hidden">
          <div className="p-5 md:p-6 border-b border-border">
            <GlassCardTitle>Holdings</GlassCardTitle>
            <GlassCardDescription>{holdings.length} positions across all entities</GlassCardDescription>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-5">Asset</th>
                  <th className="text-left py-3 px-4">Custodian</th>
                  <th className="text-left py-3 px-4">Entity</th>
                  <th className="text-right py-3 px-4">Value</th>
                  <th className="text-right py-3 px-5">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3.5 px-5">
                      <p className="font-medium">{h.symbol}</p>
                      <p className="text-xs text-muted-foreground">{h.name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{h.custodian}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{getEntityName(h.held_by_entity_id)}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-medium">
                      {formatINR(h.current_value_inr, { compact: true })}
                    </td>
                    <td
                      className={`py-3.5 px-5 text-right tabular-nums font-medium ${
                        h.gain_loss_inr > 0
                          ? "text-emerald-400"
                          : h.gain_loss_inr < 0
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {h.gain_loss_inr !== 0
                        ? formatINR(h.gain_loss_inr, { compact: true, showSign: true })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </PortalShell>
  );
}
