"use client";

import Link from "next/link";
import { Gem } from "lucide-react";

const STEPS = [
  { href: "/onboarding/profile", label: "Profile" },
  { href: "/onboarding/connect", label: "Accounts" },
  { href: "/onboarding/review", label: "Review" },
];

export function OnboardingShell({
  step,
  children,
}: {
  step: "profile" | "connect" | "review";
  children: React.ReactNode;
}) {
  const idx = step === "profile" ? 0 : step === "connect" ? 1 : 2;
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold">CAPSTONE</p>
              <p className="text-xs text-muted-foreground">Client onboarding</p>
            </div>
          </div>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </Link>
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.href}
              className={`flex-1 h-1.5 rounded-full ${i <= idx ? "bg-accent-blue" : "bg-white/10"}`}
            />
          ))}
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Step {idx + 1} of 3 — {STEPS[idx].label}
        </p>
        {children}
      </div>
    </div>
  );
}
