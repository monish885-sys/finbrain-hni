"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActionCardById } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { usePortalRoute } from "@/components/portal-route";
import { usePortalHref } from "@/hooks/use-portal-href";
import { useActionCardState } from "@/lib/use-action-cards";
import { generateHarvestExportPDF } from "@/lib/pdf-export";
import { GlassCard, PremiumBadge } from "@/components/premium";
import { GradientStatCard } from "@/components/premium/gradient-stat-card";
import { Button, formatINR } from "@capstone/ui";
import { ArrowLeft, FileDown, CheckCircle2, Zap } from "lucide-react";

export default function ActionCardDetailPage({
  params,
}: {
  params: Promise<{ id: string; portal: string }>;
}) {
  usePortalRoute("actions");
  const href = usePortalHref();
  const { id } = use(params);
  const card = getActionCardById(id);
  const { markDone, getStatus, loaded } = useActionCardState();

  if (!card) notFound();

  const status = loaded ? getStatus(card.id, card.status) : card.status;
  const isDone = status === "done";

  return (
    <PortalShell>
      <div className="space-y-6 max-w-3xl animate-fade-up">
        <Link
          href={href("actions")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Action Cards
        </Link>

        <div>
          <PremiumBadge variant={card.type === "harvest" ? "gold" : "warning"}>
            {card.type === "harvest" ? (
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Free Money</span>
            ) : (
              card.type.replace("_", " ")
            )}
          </PremiumBadge>
          <h1 className="font-display text-3xl font-semibold mt-3">{card.title}</h1>
          <p className="text-muted-foreground mt-1">{card.subtitle}</p>
        </div>

        {card.savings_inr > 0 && (
          <GradientStatCard
            variant="gold"
            label="Estimated Tax Savings"
            value={formatINR(card.savings_inr)}
            sublabel={`Execute by ${card.deadline}`}
          />
        )}

        {card.tax_without_action_inr !== undefined && card.tax_with_action_inr !== undefined && (
          <div className="grid grid-cols-2 gap-4">
            <GlassCard>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Without action</p>
              <p className="font-display text-2xl font-semibold text-red-400 tabular-nums mt-2">
                {formatINR(card.tax_without_action_inr)}
              </p>
            </GlassCard>
            <GlassCard className="border-emerald-500/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">With action</p>
              <p className="font-display text-2xl font-semibold text-emerald-400 tabular-nums mt-2">
                {formatINR(card.tax_with_action_inr)}
              </p>
            </GlassCard>
          </div>
        )}

        {card.instructions && card.instructions.length > 0 && (
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Instructions</p>
            <div className="space-y-3">
              {card.instructions.map((inst, i) => (
                <div key={i} className="rounded-xl border border-border bg-white/[0.02] p-4">
                  <p className="font-semibold text-lg">
                    {inst.action.toUpperCase()}: {inst.quantity} {inst.symbol}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Account · {inst.account}</p>
                  {inst.lot_id && <p className="text-xs text-muted-foreground font-mono mt-1">Lot #{inst.lot_id}</p>}
                  {inst.loss_inr && (
                    <p className="text-sm text-red-400 mt-2 tabular-nums">Loss: {formatINR(inst.loss_inr)}</p>
                  )}
                  {inst.offsets && (
                    <p className="text-sm text-emerald-400 mt-1">Offsets: {inst.offsets}</p>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {card.details && (
          <GlassCard>
            <p className="text-sm leading-relaxed text-muted-foreground">{card.details}</p>
          </GlassCard>
        )}

        <div className="flex flex-wrap gap-3">
          {!isDone && (
            <Button
              onClick={() => markDone(card.id)}
              className="!rounded-xl !bg-gradient-to-r !from-emerald-600 !to-teal-600 !border-0"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as done
            </Button>
          )}
          {card.type === "harvest" && (
            <Button variant="secondary" onClick={() => generateHarvestExportPDF(card.id)} className="!rounded-xl">
              <FileDown className="h-4 w-4" />
              Export instruction
            </Button>
          )}
          {isDone && <PremiumBadge variant="success">Completed</PremiumBadge>}
        </div>

        <p className="text-xs text-muted-foreground">
          CAPSTONE does not execute trades. Execute via your broker and share with your CA.
        </p>
      </div>
    </PortalShell>
  );
}
