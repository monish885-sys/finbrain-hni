"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding-shell";
import { completeAaReturn, setAuthMode } from "@/lib/live-api";

function AaReturnInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Finishing Account Aggregator consent…");

  useEffect(() => {
    setAuthMode("live");
    const success = search.get("success") ?? undefined;
    const id = search.get("id") ?? undefined;
    const familyId = search.get("familyId") ?? undefined;
    const errorcode = search.get("errorcode") ?? undefined;
    const errormsg = search.get("errormsg") ?? undefined;

    void (async () => {
      try {
        const res = await completeAaReturn({ success, id, familyId, errorcode, errormsg });
        setMessage(res.message ?? `Synced ${res.holdings_synced} holdings.`);
        setTimeout(() => {
          router.replace(
            `/onboarding/connect?connected=aa&holdings=${res.holdings_synced}`,
          );
        }, 900);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AA return failed");
      }
    })();
  }, [search, router]);

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">Returning from Setu</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We are confirming your AA consent and pulling bank / MF / demat data (read-only).
      </p>
      {message && !error && <p className="mt-6 text-sm text-emerald-400">{message}</p>}
      {error && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-red-400 break-words">{error}</p>
          <button
            type="button"
            className="text-sm text-accent-blue underline"
            onClick={() => router.push("/onboarding/connect")}
          >
            Back to connect
          </button>
        </div>
      )}
    </OnboardingShell>
  );
}

export default function AaReturnPage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <AaReturnInner />
    </Suspense>
  );
}
