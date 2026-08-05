"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import {
  fetchOnboardingStatus,
  postOnboardingComplete,
  type OnboardingStatus,
} from "@/lib/live-api";

export default function OnboardingReviewPage() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetchOnboardingStatus()
      .then((s) => {
        if (s.onboarding_status === "pending_profile") {
          router.replace("/onboarding/profile");
          return;
        }
        setStatus(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [router]);

  const complete = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await postOnboardingComplete();
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingStatus: next.onboarding_status }),
      });
      router.push("/owner/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding");
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="review">
      <h1 className="font-display text-3xl font-semibold">Review</h1>
      <p className="mt-2 text-muted-foreground">
        Confirm what we ingested. God Mode will read from your database — not Kapoor demo fixtures.
      </p>

      {status && (
        <div className="mt-8 glass-card p-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Portfolio</span>
            <span>{status.family_name ?? status.family_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Person</span>
            <span>{status.person?.name ?? "—"} ({status.person?.pan_masked ?? "—"})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assets</span>
            <span>{status.asset_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Linked accounts</span>
            <span>{status.linked_account_count}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Net worth</span>
            <span className="font-display text-lg">
              ₹{Math.round(status.total_net_worth_inr).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 space-y-3">
        <Button className="w-full !rounded-xl !py-3" onClick={() => void complete()} disabled={loading}>
          {loading ? "Finishing..." : "Complete onboarding"}
        </Button>
        <Button
          variant="secondary"
          className="w-full !rounded-xl"
          onClick={() => router.push("/onboarding/connect")}
        >
          Add more accounts
        </Button>
      </div>
    </OnboardingShell>
  );
}
