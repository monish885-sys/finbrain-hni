"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Lock, ArrowRight, Shield } from "lucide-react";
import { Button } from "@capstone/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/portals");
      router.refresh();
    } else {
      setError("Invalid demo password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <div className="absolute inset-0 stat-gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
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
              Your bank sees their book. Your CA sees last year. CAPSTONE sees everything — and tells you what to do today.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Family net worth", value: "₹42.3 Cr" },
              { label: "Tax saved YTD", value: "₹8.7 L" },
              { label: "Held-away visibility", value: "58%" },
            ].map((stat) => (
              <div key={stat.label} className="flex justify-between items-center py-3 border-t border-white/10">
                <span className="text-white/60 text-sm">{stat.label}</span>
                <span className="font-display text-xl font-semibold tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — login */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
              <Gem className="h-5 w-5 text-white" />
            </div>
            <p className="font-display text-xl font-semibold">CAPSTONE</p>
          </div>

          <h2 className="font-display text-3xl font-semibold text-foreground">Welcome back</h2>
          <p className="mt-2 text-muted-foreground">Enter the investor demo — then choose your portal.</p>

          <div className="mt-8 glass-card shimmer-border p-6 md:p-8">
            <div className="mb-6 rounded-xl bg-gold-muted border border-gold/25 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-gold" />
                <p className="text-xs font-semibold text-gold uppercase tracking-wider">Private Demo</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Password: <code className="text-gold font-medium">capstone2026</code>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-muted-foreground">
                  Access code
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter demo password"
                    className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent-blue/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="submit"
                className="w-full !rounded-xl !py-3 !bg-gradient-to-r !from-accent-blue !to-accent-purple !border-0 !shadow-lg !shadow-accent-blue/25 hover:!opacity-90"
                disabled={loading || !password}
              >
                {loading ? "Entering..." : (
                  <span className="flex items-center justify-center gap-2">
                    Enter CAPSTONE <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
