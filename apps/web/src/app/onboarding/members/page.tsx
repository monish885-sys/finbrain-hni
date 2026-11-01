"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import {
  addOnboardingPerson,
  fetchOnboardingStatus,
  type OnboardingStatus,
} from "@/lib/live-api";

export default function OnboardingMembersPage() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("spouse");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const reload = async () => {
    const s = await fetchOnboardingStatus();
    if (!s.family_id) router.replace("/onboarding/profile");
    else setStatus(s);
  };

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [router]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const s = await addOnboardingPerson({ name: name.trim(), role });
      setStatus(s);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const members = status?.persons ?? [];

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-2xl font-semibold">Family members</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add other people in this portfolio (names only for now). Their held-away assets can be entered
        under Manual accounts. AA consent covers the principal&apos;s linked FIPs.
      </p>

      <ul className="mt-6 space-y-2">
        {members.map((p) => (
          <li key={p.id} className="glass-card px-4 py-3 text-sm flex justify-between gap-3">
            <span>{p.name}</span>
            <span className="text-muted-foreground">{p.role ?? "member"}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-6 glass-card p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-muted-foreground">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/5 py-3 px-4 text-sm"
          >
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="member">Other</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full !rounded-xl !py-3" disabled={loading}>
          {loading ? "Adding…" : "Add member"}
        </Button>
      </form>

      <Button
        variant="secondary"
        className="mt-4 w-full !rounded-xl"
        onClick={() => router.push("/onboarding/connect")}
      >
        Back to connect
      </Button>
    </OnboardingShell>
  );
}
