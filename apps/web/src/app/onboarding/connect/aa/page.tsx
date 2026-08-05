"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import { fetchOnboardingStatus, postAaConsent } from "@/lib/live-api";

export default function OnboardingAaPage() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void fetchOnboardingStatus().then((s) => {
      if (!s.family_id) router.replace("/onboarding/profile");
      else setFamilyId(s.family_id);
    });
  }, [router]);

  const grant = async () => {
    if (!familyId) return;
    setLoading(true);
    setError("");
    try {
      const res = await postAaConsent(familyId);
      setMessage(
        `${res.message ?? "Consent recorded."} FIPs: ${res.fip_types.join(", ")}. Holdings ingested: ${res.holdings_ingested}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AA consent failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">Account Aggregator consent</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        You approve sharing once with your bank/broker via AA. Without TSP API keys we run a simulated
        consent — add CAS or manual accounts for real balances today.
      </p>

      <div className="mt-8 glass-card p-6 space-y-4">
        <Button className="w-full !rounded-xl !py-3" onClick={() => void grant()} disabled={loading || !familyId}>
          {loading ? "Requesting consent..." : "Grant AA consent"}
        </Button>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button variant="secondary" className="w-full !rounded-xl" onClick={() => router.push("/onboarding/connect")}>
          Back to connect
        </Button>
      </div>
    </OnboardingShell>
  );
}
