"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import { fetchOnboardingStatus, postCasIngest } from "@/lib/live-api";

const SAMPLE = `[
  {
    "id": "h_manual_1",
    "symbol": "RELIANCE",
    "name": "Reliance Industries",
    "asset_type": "equity",
    "custodian": "Zerodha",
    "held_by_entity_id": "self",
    "quantity": 10,
    "current_value_inr": 150000,
    "cost_basis_inr": 120000,
    "gain_loss_inr": 30000,
    "gain_type": "ltcg",
    "source": "cas",
    "lots": [
      {
        "lot_id": "lot_1",
        "quantity": 10,
        "buy_date": "2023-01-15",
        "buy_price_inr": 12000,
        "current_price_inr": 15000,
        "gain_loss_inr": 30000,
        "gain_type": "ltcg"
      }
    ]
  }
]`;

export default function OnboardingCasPage() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [broker, setBroker] = useState("zerodha");
  const [payload, setPayload] = useState(SAMPLE);
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

  const submit = async () => {
    if (!familyId) return;
    setLoading(true);
    setError("");
    try {
      JSON.parse(payload);
      const res = await postCasIngest(familyId, payload, broker);
      setMessage(`Imported ${res.lots_imported} lots with STCG/LTCG via Fin calculators.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CAS import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">CAS / holdings upload</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste holdings JSON (PDF parse comes later). Tax lots computed deterministically — never by the LLM.
      </p>

      <div className="mt-6 glass-card p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Broker</label>
          <select
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          >
            <option value="zerodha">Zerodha</option>
            <option value="groww">Groww</option>
            <option value="auto">Other / auto</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Holdings JSON</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={14}
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-xs font-mono"
          />
        </div>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button className="w-full !rounded-xl !py-3" onClick={() => void submit()} disabled={loading || !familyId}>
          {loading ? "Importing..." : "Import CAS"}
        </Button>
        <Button variant="secondary" className="w-full !rounded-xl" onClick={() => router.push("/onboarding/connect")}>
          Back to connect
        </Button>
      </div>
    </OnboardingShell>
  );
}
