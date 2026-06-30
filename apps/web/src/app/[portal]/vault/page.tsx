"use client";

import Link from "next/link";
import { demoData } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import {
  PageHeader,
  GlassCard,
  GlassCardTitle,
  GlassCardDescription,
  PremiumBadge,
} from "@/components/premium";
import { formatINR } from "@capstone/ui";
import { Vault, FileText, Phone, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { usePortalHref } from "@/hooks/use-portal-href";
import { PLATFORM_DISCLAIMER } from "@capstone/types";

const NOMINEE_AUDIT = [
  { account: "Savings", institution: "HDFC", nominee: "Spouse", status: "valid" as const },
  { account: "Demat", institution: "Zerodha", nominee: "None", status: "missing" as const },
  { account: "MF Folio", institution: "ICICI", nominee: "Father (deceased)", status: "outdated" as const },
  { account: "PMS", institution: "Marcellus", nominee: "Spouse", status: "valid" as const },
  { account: "Insurance", institution: "LIC", nominee: "Spouse", status: "valid" as const },
];

const PLAYBOOK_STEPS = [
  { step: 1, title: "Contact family CA", detail: "CA Vikram Desai · vikram@demo-capstone.in" },
  { step: 2, title: "Access document vault", detail: "Encrypted wills, deeds, and account inventory" },
  { step: 3, title: "Notify institutions", detail: "Use pre-drafted letters in vault export pack" },
  { step: 4, title: "Review nominee gaps", detail: "2 accounts need immediate update" },
];

export default function VaultPage() {
  usePortalRoute("vault");
  const href = usePortalHref();
  const { family } = demoData;

  return (
    <PortalShell>
      <div className="space-y-8 max-w-4xl">
        <PageHeader
          eyebrow="If I'm Gone"
          title="Succession Vault"
          description="Emergency playbook, nominee audit, and access instructions — not a will substitute."
          icon={<Vault className="h-7 w-7 text-rose-400" />}
          badge={<PremiumBadge variant="warning">Standby</PremiumBadge>}
        />

        <PortalScopeBanner />

        <GlassCard className="border-rose-500/20 bg-rose-500/5">
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Trigger status: Inactive</p>
              <p className="text-sm text-muted-foreground mt-1">
                Successor access activates only when Rahul configures inactivity, manual, or legal
                event trigger. No surveillance until then.
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-4 sm:grid-cols-2">
          <GradientMini label="Family estate" value={formatINR(family.total_net_worth_inr, { compact: true })} />
          <GradientMini label="Nominee gaps" value={String(family.nominee_gaps)} warn />
        </div>

        <GlassCard>
          <GlassCardTitle>Nominee Audit</GlassCardTitle>
          <GlassCardDescription>Accounts requiring attention before an emergency</GlassCardDescription>
          <div className="mt-6 space-y-3">
            {NOMINEE_AUDIT.map((row) => (
              <div
                key={row.account}
                className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <p className="font-medium">{row.account}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.institution} · Nominee: {row.nominee}
                  </p>
                </div>
                {row.status === "valid" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardTitle>Emergency Playbook</GlassCardTitle>
          <GlassCardDescription>Step-by-step instructions for successors</GlassCardDescription>
          <ol className="mt-6 space-y-4">
            {PLAYBOOK_STEPS.map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-sm font-semibold text-accent-blue">
                  {s.step}
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </GlassCard>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Export playbook PDF
          </button>
          <Link
            href={href("dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Emergency contacts
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">{PLATFORM_DISCLAIMER}</p>
      </div>
    </PortalShell>
  );
}

function GradientMini({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <GlassCard>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-3xl font-semibold mt-2 tabular-nums ${warn ? "text-amber-400" : ""}`}>
        {value}
      </p>
    </GlassCard>
  );
}
