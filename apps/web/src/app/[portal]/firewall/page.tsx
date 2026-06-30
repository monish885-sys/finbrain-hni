"use client";

import { useState } from "react";
import Link from "next/link";
import { demoData } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import { usePortalHref } from "@/hooks/use-portal-href";
import {
  PageHeader,
  GradientStatCard,
  GlassCard,
  PremiumBadge,
} from "@/components/premium";
import { formatINR, formatRelativeTime } from "@capstone/ui";
import { generateCAExportPDF } from "@/lib/pdf-export";
import { Shield, FileDown, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@capstone/ui";
import type { Mismatch } from "@capstone/types";
import { cn } from "@capstone/ui";

type SeverityFilter = "all" | "critical" | "warning" | "info";

function severityBadge(severity: Mismatch["severity"]) {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "info" as const;
}

export default function FirewallPage() {
  usePortalRoute("firewall");
  const href = usePortalHref();
  const { firewall } = demoData;
  const [selected, setSelected] = useState<Mismatch | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const filtered =
    filter === "all"
      ? firewall.mismatches
      : firewall.mismatches.filter((m) =>
          filter === "critical"
            ? m.severity === "critical"
            : filter === "warning"
              ? m.severity === "warning"
              : m.severity === "info"
        );

  return (
    <PortalShell>
      <div className="space-y-8">
        <PortalScopeBanner />
        <PageHeader
          eyebrow="Tax-Notice Firewall"
          title="AIS Reconciliation"
          description="Catch mismatches before the Income Tax Department sends a notice."
          icon={<Shield className="h-8 w-8 text-accent-blue" />}
          badge={
            <Button variant="secondary" size="sm" onClick={() => generateCAExportPDF()}>
              <FileDown className="h-4 w-4" />
              Export to CA
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientStatCard
            variant="dark"
            label="AIS Entries"
            value={firewall.status.ais_entries_checked}
            sublabel="Checked this scan"
          />
          <GradientStatCard
            variant="emerald"
            label="Matched"
            value={firewall.status.matched}
            icon={<CheckCircle2 className="h-5 w-5 text-white/70" />}
          />
          <GradientStatCard
            variant="dark"
            label="Needs Attention"
            value={
              <span className="text-amber-400">{firewall.status.needs_attention}</span>
            }
          />
          <GradientStatCard
            variant="primary"
            label="Status"
            value={
              firewall.status.needs_attention === 0 ? (
                <span className="text-emerald-300">Clean</span>
              ) : (
                <span>Review</span>
              )
            }
            sublabel={`Scanned ${formatRelativeTime(firewall.status.last_scan)}`}
            icon={<RefreshCw className="h-4 w-4 text-white/60" />}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: "All", count: firewall.mismatches.length },
              {
                id: "critical" as const,
                label: "Critical",
                count: firewall.mismatches.filter((m) => m.severity === "critical").length,
              },
              {
                id: "warning" as const,
                label: "Warning",
                count: firewall.mismatches.filter((m) => m.severity === "warning").length,
              },
              {
                id: "info" as const,
                label: "Info",
                count: firewall.mismatches.filter((m) => m.severity === "info").length,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
                filter === f.id
                  ? "bg-accent-blue/15 border-accent-blue/40 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <GlassCard padding="none" className="overflow-hidden">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="text-left py-3 px-5">Severity</th>
                <th className="text-left py-3 px-4">Mismatch</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Institution</th>
                <th className="text-right py-3 px-5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(m)}
                >
                  <td className="py-4 px-5">
                    <PremiumBadge variant={severityBadge(m.severity)} pulse={m.severity === "critical"}>
                      {m.severity}
                    </PremiumBadge>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.type.replace(/_/g, " ")}</p>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground hidden md:table-cell">{m.institution}</td>
                  <td className="py-4 px-5 text-right font-medium tabular-nums">
                    {formatINR(m.amount_inr, { compact: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <GlassCard solid shimmer className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <PremiumBadge variant={severityBadge(selected.severity)}>{selected.type.replace(/_/g, " ")}</PremiumBadge>
                <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="font-display text-2xl font-semibold">{selected.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{selected.description}</p>

              <div className="mt-5 rounded-xl bg-white/[0.03] border border-border p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">Suggested fix</p>
                <p className="text-sm mt-2 leading-relaxed">{selected.suggested_fix}</p>
              </div>

              {selected.ais_reference && (
                <p className="text-xs text-muted-foreground mt-4 font-mono">{selected.ais_reference}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-6">
                <Button onClick={() => generateCAExportPDF(selected.id)}>
                  <FileDown className="h-4 w-4" />
                  Export to CA
                </Button>
                <Link href={href("actions")}>
                  <Button variant="secondary">View Action Card</Button>
                </Link>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
