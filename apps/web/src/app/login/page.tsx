"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gem, Lock, ArrowRight, Shield, Mail } from "lucide-react";
import { Button } from "@capstone/ui";
import {
  establishWebSession,
  fetchOnboardingStatus,
  isLiveApiEnabled,
  liveLogin,
} from "@/lib/live-api";

type Tab = "client" | "demo";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>(isLiveApiEnabled() ? "client" : "demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await liveLogin(email.trim(), password);
      const status = await fetchOnboardingStatus();
      await establishWebSession({
        mode: "live",
        onboardingStatus: status.onboarding_status,
      });
      if (status.onboarding_status !== "complete") {
        const step =
          status.onboarding_status === "pending_profile"
            ? "/onboarding/profile"
            : status.onboarding_status === "pending_accounts"
              ? "/onboarding/connect"
              : "/onboarding/review";
        router.push(step);
      } else {
        router.push("/owner/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: demoPassword }),
    });

    if (res.ok) {
      if (isLiveApiEnabled()) {
        try {
          await liveLogin("vikram@kapoor.demo", demoPassword);
        } catch {
          /* demo cookie still valid */
        }
      }
      await establishWebSession({ mode: "demo", onboardingStatus: "complete" });
      router.push("/portals");
      router.refresh();
    } else {
      setError("Invalid demo password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <div className="absolute inset-0 stat-gradient-primary opacity-90" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
                <Gem className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">CAPSTONE</p>
                <p className="text-xs text-white/60 uppercase tracking-[0.2em]">Wealth Command Layer</p>
              </div>
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-tight max-w-md">
              Clarity, control, and action for family wealth
            </h1>
            <p className="mt-6 text-white/70 text-lg max-w-md leading-relaxed">
              Connect your accounts once. CAPSTONE reads banks and brokers via consent — never executes trades.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-up">
          <h2 className="font-display text-3xl font-semibold text-foreground">Welcome back</h2>
          <p className="mt-2 text-muted-foreground">Sign in to your portfolio or open the investor demo.</p>

          <div className="mt-6 flex gap-2 p-1 rounded-xl bg-white/5 border border-border">
            <button
              type="button"
              onClick={() => setTab("client")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "client" ? "bg-white/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setTab("demo")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "demo" ? "bg-white/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              Demo
            </button>
          </div>

          <div className="mt-6 glass-card shimmer-border p-6 md:p-8">
            {tab === "client" ? (
              <form onSubmit={handleClientLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground focus:border-accent-blue/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground focus:border-accent-blue/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading}>
                  {loading ? "Signing in..." : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  New client?{" "}
                  <Link href="/register" className="text-accent-blue hover:underline">
                    Create account
                  </Link>
                </p>
              </form>
            ) : (
              <>
                <div className="mb-6 rounded-xl bg-gold-muted border border-gold/25 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-gold" />
                    <p className="text-xs font-semibold text-gold uppercase tracking-wider">Private Demo</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Password: <code className="text-gold font-medium">capstone2026</code>
                  </p>
                </div>
                <form onSubmit={handleDemoLogin} className="space-y-5">
                  <div>
                    <label htmlFor="demo-password" className="mb-2 block text-sm font-medium text-muted-foreground">
                      Access code
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="demo-password"
                        type="password"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        placeholder="Enter demo password"
                        className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground focus:border-accent-blue/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                      />
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading || !demoPassword}>
                    {loading ? "Entering..." : (
                      <span className="flex items-center justify-center gap-2">
                        Enter demo <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
