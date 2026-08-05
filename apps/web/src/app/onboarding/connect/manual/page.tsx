"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import { fetchOnboardingStatus, postManualAccounts } from "@/lib/live-api";

export default function OnboardingManualPage() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [name, setName] = useState("Savings account");
  const [custodian, setCustodian] = useState("HDFC Bank");
  const [assetType, setAssetType] = useState("cash");
  const [value, setValue] = useState("500000");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) return;
    setLoading(true);
    setError("");
    try {
      const res = await postManualAccounts(familyId, [
        {
          name: name.trim(),
          custodian: custodian.trim(),
          assetType,
          currentValueInr: Number(value),
          costBasisInr: Number(value),
        },
      ]);
      setMessage(`Added ${res.assets_created} account(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">Manual account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For banks/FDs not yet on AA, or held-away assets. Instructions only — no money movement.
      </p>

      <form onSubmit={submit} className="mt-6 glass-card p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Label</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Institution</label>
          <input
            value={custodian}
            onChange={(e) => setCustodian(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          >
            <option value="cash">Bank / cash</option>
            <option value="fd">FD</option>
            <option value="equity">Equity</option>
            <option value="mf">Mutual fund</option>
            <option value="re">Real estate</option>
            <option value="gold">Gold</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Current value (INR)</label>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading || !familyId}>
          {loading ? "Saving..." : "Add account"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full !rounded-xl"
          onClick={() => router.push("/onboarding/connect")}
        >
          Back to connect
        </Button>
      </form>
    </OnboardingShell>
  );
}
