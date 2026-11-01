"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import { postOnboardingProfile } from "@/lib/live-api";

async function syncOnboardingCookie(status: string) {
  await fetch("/api/auth/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboardingStatus: status }),
  });
}

export default function OnboardingProfilePage() {
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [mobile, setMobile] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const status = await postOnboardingProfile({
        name: name.trim(),
        pan: pan.trim().toUpperCase(),
        mobile: mobile.replace(/\D/g, ""),
        familyName: familyName.trim() || undefined,
      });
      await syncOnboardingCookie(status.onboarding_status);
      router.push("/onboarding/connect");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="profile">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>
      <p className="mt-2 text-muted-foreground">
        PAN identifies your portfolio. Mobile is required for Account Aggregator (Setu) consent —
        OTP goes to that number. We never invent holdings from PAN alone.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 glass-card p-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Legal name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">PAN</label>
          <input
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            required
            maxLength={10}
            placeholder="ABCDE1234F"
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm uppercase tracking-wider"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Mobile (AA OTP)</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile"
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm tracking-wider"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Portfolio name (optional)</label>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. Family portfolio"
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading}>
          {loading ? "Saving..." : "Continue to accounts"}
        </Button>
      </form>
    </OnboardingShell>
  );
}
