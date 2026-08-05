"use client";

import { useEffect, useState } from "react";
import { demoData, getPendingActionCards } from "@capstone/demo-data";
import type { ActionCard, Family, FirewallData, Holding } from "@capstone/types";
import {
  fetchActionCards,
  fetchFirewall,
  fetchMe,
  fetchNetWorth,
  getAuthMode,
  isLiveApiEnabled,
  patchActionCard,
  setAuthMode,
  tokenPresent,
} from "@/lib/live-api";
import { setFinFamilyId } from "@/lib/fin-client";

export type LiveWealthState = {
  mode: "live" | "demo" | "loading" | "empty";
  family: Family;
  holdings: Holding[];
  firewall: FirewallData;
  actionCards: ActionCard[];
  familyId?: string;
  error?: string;
  markCard: (id: string, status: "pending" | "done" | "dismissed") => Promise<void>;
  refresh: () => Promise<void>;
};

const emptyFamily = (): Family => ({
  family_id: "",
  name: "Your portfolio",
  total_net_worth_inr: 0,
  delta_today_inr: 0,
  delta_month_inr: 0,
  tax_saved_ytd_inr: 0,
  held_away_pct: 0,
  primary_bank: "",
  last_sync: new Date().toISOString(),
  nominee_gaps: 0,
  entity_count: 0,
  entities: [],
  asset_classes: { equity: 0, debt: 0, re: 0, alts: 0, cash: 0 },
});

const emptyFirewall = (): FirewallData => ({
  status: {
    status: "clean",
    last_scan: new Date().toISOString(),
    ais_entries_checked: 0,
    matched: 0,
    needs_attention: 0,
  },
  mismatches: [],
});

/**
 * Live God Mode — authenticated clients never fall back to Kapoor fixtures.
 */
export function useLiveWealth(): LiveWealthState {
  const [mode, setMode] = useState<"live" | "demo" | "loading" | "empty">("loading");
  const [family, setFamily] = useState<Family>(emptyFamily());
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [firewall, setFirewall] = useState<FirewallData>(emptyFirewall());
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  const [familyId, setFamilyId] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = async () => {
    if (!isLiveApiEnabled()) {
      setMode("demo");
      setFamily(demoData.family);
      setHoldings(demoData.holdings);
      setFirewall(demoData.firewall);
      setActionCards(demoData.action_cards);
      setFamilyId(demoData.family.family_id);
      return;
    }

    // Token without mode → treat as live client (fixes stale sessions)
    if (tokenPresent() && getAuthMode() !== "demo") {
      setAuthMode("live");
    }

    const modeNow = getAuthMode();
    if (modeNow === "demo" || (!tokenPresent() && modeNow !== "live")) {
      if (modeNow === "demo") {
        setMode("demo");
        setFamily(demoData.family);
        setHoldings(demoData.holdings);
        setFirewall(demoData.firewall);
        setActionCards(demoData.action_cards);
        setFamilyId(demoData.family.family_id);
        return;
      }
    }

    if (!tokenPresent()) {
      setMode("empty");
      setError("Not signed in — use Client login");
      setFamily(emptyFamily());
      setHoldings([]);
      return;
    }

    try {
      setMode("loading");
      const me = await fetchMe();
      const id = me.primary_family_id;
      if (!id) {
        setFamily(emptyFamily());
        setHoldings([]);
        setFirewall(emptyFirewall());
        setActionCards([]);
        setFamilyId(undefined);
        setError(undefined);
        setMode("empty");
        return;
      }
      const nw = await fetchNetWorth(id);
      let fw: FirewallData = emptyFirewall();
      let cards: ActionCard[] = [];
      try {
        fw = await fetchFirewall(id);
      } catch {
        /* ok */
      }
      try {
        cards = await fetchActionCards(id);
      } catch {
        /* ok */
      }
      setFamily(nw.family);
      setHoldings(nw.holdings);
      setFirewall(fw);
      setActionCards(cards);
      setFamilyId(id);
      setFinFamilyId(id);
      setError(undefined);
      setMode(nw.holdings.length === 0 ? "empty" : "live");
    } catch (e) {
      setMode("empty");
      setError(e instanceof Error ? e.message : "API unavailable");
      setFamily(emptyFamily());
      setHoldings([]);
      setFirewall(emptyFirewall());
      setActionCards([]);
      setFinFamilyId(null);
    }
  };

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markCard = async (id: string, status: "pending" | "done" | "dismissed") => {
    if (mode === "live" || mode === "empty") {
      try {
        const updated = await patchActionCard(id, status);
        setActionCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } catch {
        /* ignore */
      }
      return;
    }
    setActionCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  return { mode, family, holdings, firewall, actionCards, familyId, error, markCard, refresh };
}

export function pendingCardsForMode(live: LiveWealthState, scopedIds?: string[]) {
  if (live.mode === "live" || live.mode === "empty") {
    return live.actionCards.filter((c) => c.status === "pending");
  }
  const pending = getPendingActionCards();
  if (!scopedIds) return pending;
  return pending.filter((c) => scopedIds.includes(c.id));
}
