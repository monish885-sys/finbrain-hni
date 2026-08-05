"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import { confirmAaJourney, setAuthMode } from "@/lib/live-api";

function AaJourneyInner() {
  const search = useSearchParams();
  const router = useRouter();
  const familyId = search.get("familyId") ?? "";
  const state = search.get("state") ?? "";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthMode("live");
  }, []);

  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await confirmAaJourney(familyId, state);
      setMessage(res.message ?? `Consent saved. Holdings synced: ${res.holdings_synced}.`);
      setTimeout(() => router.push("/onboarding/connect?connected=aa&holdings=" + res.holdings_synced), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AA confirm failed");
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">Account Aggregator consent</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You are approving CAPSTONE as a Financial Information User to <strong>read</strong> bank / MF /
        demat data linked to your PAN. We never take passwords or move money. With a live TSP, this
        step redirects to your bank&apos;s AA journey; until then, confirm consent here.
      </p>

      <div className="mt-8 glass-card p-6 space-y-4">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
          <li>Purpose: net worth, tax firewall, Action Cards (instructions only)</li>
          <li>Frequency: refresh about every 6 hours while consent is active</li>
          <li>You can revoke consent anytime via your AA / bank app</li>
        </ul>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          className="w-full !rounded-xl !py-3"
          disabled={loading || !familyId || !state}
          onClick={() => void confirm()}
        >
          {loading ? "Saving consent…" : "I consent — fetch my FI data"}
        </Button>
        <Button
          variant="secondary"
          className="w-full !rounded-xl"
          onClick={() => router.push("/onboarding/connect")}
        >
          Cancel
        </Button>
      </div>
    </OnboardingShell>
  );
}

export default function AaJourneyPage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <AaJourneyInner />
    </Suspense>
  );
}
