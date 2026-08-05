"use client";

import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import { getPortalScope } from "@/lib/portals";
import { usePortalHref } from "@/hooks/use-portal-href";
import { useActionCardState } from "@/lib/use-action-cards";
import {
  PageHeader,
  GradientStatCard,
  GlassCard,
  PremiumBadge,
} from "@/components/premium";
import { formatINR } from "@capstone/ui";
import { Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import type { ActionCard, ActionCardType } from "@capstone/types";
import { cn } from "@capstone/ui";
import { useLiveWealth } from "@/hooks/use-live-wealth";

function typeLabel(type: ActionCardType) {
  const labels: Record<ActionCardType, string> = {
    harvest: "Free Money",
    firewall_fix: "Firewall Fix",
    nominee_fix: "Nominee",
    manager_alert: "Manager Alert",
    advance_tax: "Advance Tax",
  };
  return labels[type];
}

function typeVariant(type: ActionCardType) {
  if (type === "harvest") return "gold" as const;
  if (type === "firewall_fix") return "danger" as const;
  if (type === "advance_tax") return "warning" as const;
  return "info" as const;
}

export default function ActionsPage() {
  const portalId = usePortalRoute("actions");
  const scope = getPortalScope(portalId);
  const { getStatus, loaded } = useActionCardState();
  const live = useLiveWealth();
  const cards = live.mode === "live" || live.mode === "empty" ? live.actionCards : scope.actionCards;

  const visible = cards.filter((c) => {
    if (live.mode === "live" || live.mode === "empty") return c.status !== "dismissed";
    const status = loaded ? getStatus(c.id, c.status) : c.status;
    return status !== "dismissed";
  });

  const statusOf = (id: string, fallback: typeof cards[0]["status"]) =>
    live.mode === "live" || live.mode === "empty"
      ? (cards.find((c) => c.id === id)?.status ?? fallback)
      : loaded
        ? getStatus(id, fallback)
        : fallback;

  const pending = visible.filter((c) => statusOf(c.id, c.status) === "pending");
  const done = visible.filter((c) => statusOf(c.id, c.status) === "done");

  const totalSavings = pending.reduce((s, c) => s + c.savings_inr, 0);

  return (
    <PortalShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Action Cards"
          title="What to Do Today"
          description="Tax harvests, firewall fixes, and compliance — ranked by impact."
          icon={<Zap className="h-7 w-7 text-gold" />}
        />

        <PortalScopeBanner />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GradientStatCard variant="gold" label="Pending" value={pending.length} sublabel="Require action" />
          <GradientStatCard
            variant="emerald"
            label="Completed"
            value={done.length}
            icon={<CheckCircle2 className="h-5 w-5 text-white/70" />}
          />
          <GradientStatCard
            variant="primary"
            label="Potential Savings"
            value={formatINR(totalSavings, { compact: true })}
            sublabel="From pending harvests"
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</p>
          {pending.map((card) => (
            <ActionCardRow key={card.id} card={card} />
          ))}
          {pending.length === 0 && (
            <GlassCard className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-muted-foreground">All action cards completed</p>
            </GlassCard>
          )}
        </div>

        {done.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
            {done.map((card) => (
              <ActionCardRow key={card.id} card={card} done />
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function ActionCardRow({
  card,
  done = false,
}: {
  card: ActionCard;
  done?: boolean;
}) {
  const href = usePortalHref();
  const isHarvest = card.type === "harvest";

  return (
    <Link href={href(`actions/${card.id}`)}>
      <GlassCard
        className={cn(
          "group transition-all hover:border-accent-blue/30",
          done && "opacity-50",
          isHarvest && !done && "border-gold/20 bg-gold-muted/30"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <PremiumBadge variant={typeVariant(card.type)}>{typeLabel(card.type)}</PremiumBadge>
              {card.priority === "high" && !done && <PremiumBadge variant="danger">High</PremiumBadge>}
              {done && <PremiumBadge variant="success">Done</PremiumBadge>}
            </div>
            <p className="font-display text-lg font-semibold">{card.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{card.subtitle}</p>
            <p className="text-xs text-muted-foreground mt-2">Due {card.deadline}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {card.savings_inr > 0 && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-gold">Save</p>
                <p className="font-display text-2xl font-semibold text-gold tabular-nums">
                  {formatINR(card.savings_inr, { compact: true })}
                </p>
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent-blue transition-colors" />
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
