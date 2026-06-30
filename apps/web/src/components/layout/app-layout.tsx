"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Shield,
  Zap,
  Sparkles,
  Eye,
  Hourglass,
  LogOut,
  Menu,
  Gem,
  Bell,
  ChevronRight,
} from "lucide-react";
import { cn } from "@capstone/ui";
import { PremiumBadge } from "@/components/premium";

const navItems = [
  { href: "/dashboard", label: "Daily Glance", icon: LayoutDashboard },
  { href: "/wealth", label: "God Mode", icon: Gem },
  { href: "/firewall", label: "Tax Firewall", icon: Shield },
  { href: "/actions", label: "Action Cards", icon: Zap },
  { href: "/architect", label: "ARCHITECT", icon: Sparkles },
  { href: "/honesty-check", label: "Honesty Check", icon: Eye, teaser: true },
  { href: "/time-machine", label: "Time Machine", icon: Hourglass, teaser: true },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "nav-active text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-accent-blue" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="flex-1">{item.label}</span>
            {item.teaser && <PremiumBadge variant="gold">Q3</PremiumBadge>}
            {active && <ChevronRight className="h-3.5 w-3.5 text-accent-blue opacity-60" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple shadow-lg shadow-accent-blue/20">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground leading-none">
                CAPSTONE
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-0.5">
                Wealth Command Layer
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <PremiumBadge variant="gold" className="hidden md:inline-flex">
              Demo
            </PremiumBadge>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 text-muted-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400 pulse-dot" />
            </button>
            <div className="hidden md:block text-right pl-3 border-l border-border">
              <p className="text-sm font-medium text-foreground">Rahul Sharma</p>
              <p className="text-[11px] text-muted-foreground">PAN · ABCPR1234A</p>
            </div>
            <div className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-amber-600/20 border border-gold/30 text-sm font-semibold text-gold">
              R
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 border-r border-border min-h-[calc(100vh-4rem)]">
          <div className="sticky top-16 flex w-full flex-col h-[calc(100vh-4rem)] p-4">
            <NavItems />
            <div className="mt-auto space-y-3 pt-4 border-t border-border">
              <div className="rounded-xl bg-gold-muted border border-gold/20 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">Investor Demo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Rahul family · ₹42.3 Cr</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 glass-card-solid p-4 flex flex-col">
              <div className="flex items-center justify-between mb-6 pt-2">
                <p className="font-display text-xl font-semibold">CAPSTONE</p>
                <button type="button" onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                  ✕
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6 md:py-8">{children}</div>
          <footer className="border-t border-border py-5 text-center">
            <p className="text-[11px] text-muted-foreground tracking-wide">
              Encrypted · India-hosted · No trade execution · Fee-only advisory
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
