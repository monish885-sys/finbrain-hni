"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FileSpreadsheet, Landmark, ArrowRight, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@capstone/ui";
import { OnboardingShell } from "@/components/onboarding-shell";
import {
  fetchConnectorDiscover,
  fetchOnboardingStatus,
  setAuthMode,
  startConnector,
  syncConnectors,
  type ConnectorDiscover,
  type OnboardingStatus,
} from "@/lib/live-api";

function ConnectInner() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [discover, setDiscover] = useState<ConnectorDiscover | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();

  const reload = useCallback(async () => {
    const s = await fetchOnboardingStatus();
    if (s.onboarding_status === "pending_profile") {
      router.replace("/onboarding/profile");
      return;
    }
    setStatus(s);
    setAuthMode("live");
    if (s.family_id) {
      const d = await fetchConnectorDiscover(s.family_id);
      setDiscover(d);
    }
  }, [router]);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [reload]);

  useEffect(() => {
    const connected = search.get("connected");
    const holdings = search.get("holdings");
    const err = search.get("error");
    if (connected) {
      setInfo(`Connected ${connected}${holdings ? ` — synced ${holdings} holdings` : ""}.`);
      void reload();
    }
    if (err) setError(err);
  }, [search, reload]);

  const connectProvider = async (provider: string) => {
    if (!status?.family_id) return;
    setBusy(provider);
    setError("");
    try {
      const start = await startConnector(provider, status.family_id, "/onboarding/connect");
      window.location.href = start.redirect_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
      setBusy(null);
    }
  };

  const refreshSync = async () => {
    if (!status?.family_id) return;
    setBusy("sync");
    try {
      await syncConnectors(status.family_id);
      await reload();
      setInfo("Synced connected accounts.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  };

  const canReview =
    (status?.asset_count ?? 0) > 0 ||
    (status?.linked_account_count ?? 0) > 0 ||
    (status?.consent_count ?? 0) > 0;

  return (
    <OnboardingShell step="connect">
      <h1 className="font-display text-3xl font-semibold">Connect & authenticate</h1>
      <p className="mt-2 text-muted-foreground">
        After PAN, we do not invent balances. Log in at each broker/bank — Upstox/Zerodha OAuth or RBI
        Account Aggregator — and we sync read-only every 6 hours.
      </p>

      {discover && (
        <p className="mt-3 text-sm text-muted-foreground">
          Portfolio for {discover.pan_masked}. {discover.message}
        </p>
      )}

      {info && <p className="mt-4 text-sm text-emerald-400">{info}</p>}
      {error && <p className="mt-4 text-sm text-red-400 break-words">{error}</p>}

      {status && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Linked: {status.linked_account_count} · Assets: {status.asset_count} · Net worth: ₹
            {Math.round(status.total_net_worth_inr).toLocaleString("en-IN")}
          </span>
          <Button
            variant="secondary"
            className="!rounded-lg !py-1.5 !px-3 !text-xs"
            onClick={() => void refreshSync()}
            disabled={busy === "sync"}
          >
            <RefreshCw className="h-3 w-3 mr-1 inline" />
            Sync now
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {(discover?.connectors ?? []).map((c) => {
          const connected = c.connection?.status === "active";
          return (
            <div key={c.provider} className="glass-card p-5">
              <div className="flex items-start gap-4">
                <Landmark className="h-6 w-6 text-accent-blue mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.label}</p>
                    {connected && (
                      <span className="text-xs text-emerald-400 uppercase tracking-wide">Connected</span>
                    )}
                    {!c.configured && (
                      <span className="text-xs text-amber-400">API keys required</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                  {c.connection?.last_sync_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sync {new Date(c.connection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                  {c.connection?.last_error && (
                    <p className="text-xs text-red-400 mt-1">{c.connection.last_error}</p>
                  )}
                  {!c.configured && c.missing_env.length > 0 && (
                    <p className="text-xs text-amber-400/90 mt-2">
                      Add to apps/api/.env: {c.missing_env.join(", ")}
                    </p>
                  )}
                </div>
                <Button
                  className="!rounded-xl shrink-0"
                  disabled={busy === c.provider || (c.provider !== "aa" && !c.configured)}
                  onClick={() => void connectProvider(c.provider)}
                >
                  {busy === c.provider ? "…" : connected ? "Re-auth" : "Connect"}
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5 inline" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs uppercase tracking-wider text-muted-foreground">Fallbacks</p>
      <div className="mt-3 space-y-3">
        {[
          {
            href: "/onboarding/connect/cas",
            icon: FileSpreadsheet,
            title: "CAS / holdings JSON",
            desc: "Upload broker export if OAuth keys are not ready yet.",
          },
          {
            href: "/onboarding/connect/manual",
            icon: Building2,
            title: "Manual accounts",
            desc: "Bank/FD/held-away balances you enter yourself.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 glass-card p-4 hover:bg-white/5 transition-colors"
          >
            <item.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Button
          className="w-full !rounded-xl !py-3"
          disabled={!canReview}
          onClick={() => router.push("/onboarding/review")}
        >
          Review & finish
        </Button>
        {!canReview && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Authenticate at least one broker/bank (or add CAS/manual) to continue.
          </p>
        )}
      </div>
    </OnboardingShell>
  );
}

export default function OnboardingConnectPage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading connections…</div>}>
      <ConnectInner />
    </Suspense>
  );
}
