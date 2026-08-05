"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gem, Lock, ArrowRight, Mail, User } from "lucide-react";
import { Button } from "@capstone/ui";
import { establishWebSession, liveRegister } from "@/lib/live-api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await liveRegister(email.trim(), password, name.trim());
      await establishWebSession({ mode: "live", onboardingStatus: "pending_profile" });
      router.push("/onboarding/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <p className="font-display text-xl font-semibold">CAPSTONE</p>
        </div>
        <h1 className="font-display text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Onboard as a client — connect accounts next. Read-only; we never move money.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 glass-card p-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Password (min 8)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-border bg-white/5 py-3 pl-11 pr-4 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading}>
            {loading ? "Creating..." : (
              <span className="flex items-center justify-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-blue hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
