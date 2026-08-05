"use client";

import Link from "next/link";
import {
  Gem,
  Crown,
  Heart,
  Briefcase,
  Calculator,
  Building2,
  Shield,
  ArrowRight,
  LogOut,
} from "lucide-react";
import type { PortalId } from "@capstone/types";
import { PORTAL_IDS, PORTALS, resolvePortalHome } from "@/lib/portals";
import { PremiumBadge } from "@/components/premium";

const PORTAL_ICONS: Record<PortalId, typeof Gem> = {
  owner: Crown,
  family: Heart,
  investor: Briefcase,
  ca: Calculator,
  rm: Building2,
  successor: Shield,
};

const PORTAL_GRADIENT: Record<PortalId, string> = {
  owner: "from-accent-blue/20 to-accent-purple/20 border-accent-blue/30",
  family: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30",
  investor: "from-violet-500/20 to-purple-600/20 border-violet-500/30",
  ca: "from-amber-500/20 to-orange-600/20 border-amber-500/30",
  rm: "from-blue-500/20 to-cyan-600/20 border-blue-500/30",
  successor: "from-rose-500/20 to-pink-600/20 border-rose-500/30",
};

export default function PortalsPage() {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">CAPSTONE</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                Advisor Mesh · Demo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-14">
        <div className="max-w-2xl mb-10 animate-fade-up">
          <PremiumBadge variant="gold" className="mb-4">
            Kapoor Family Demo
          </PremiumBadge>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Choose your portal
          </h1>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
            Six permissioned views on the same family wealth — each role sees only what consent
            allows. Same CAPSTONE flow, scoped by Advisor Mesh.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_IDS.map((id: PortalId) => {
            const portal = PORTALS[id];
            const Icon = PORTAL_ICONS[id];
            return (
              <Link
                key={id}
                href={resolvePortalHome(id)}
                className={`group glass-card shimmer-border p-6 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg ${PORTAL_GRADIENT[id]}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <PremiumBadge variant="default">{portal.badge}</PremiumBadge>
                </div>
                <h2 className="font-display text-xl font-semibold">{portal.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{portal.tagline}</p>
                <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed line-clamp-3">
                  {portal.description}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-4 border-t border-border pt-3">
                  {portal.scopeNote}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-blue group-hover:gap-2.5 transition-all">
                  Enter portal <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
