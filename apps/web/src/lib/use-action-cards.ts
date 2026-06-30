"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "capstone_action_cards";

export function useActionCardState() {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { done: string[]; dismissed: string[] };
        setDoneIds(new Set(parsed.done ?? []));
        setDismissedIds(new Set(parsed.dismissed ?? []));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const persist = (done: Set<string>, dismissed: Set<string>) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ done: [...done], dismissed: [...dismissed] })
    );
  };

  const markDone = (id: string) => {
    const next = new Set(doneIds);
    next.add(id);
    setDoneIds(next);
    persist(next, dismissedIds);
  };

  const dismiss = (id: string) => {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    persist(doneIds, next);
  };

  const reset = () => {
    setDoneIds(new Set());
    setDismissedIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
  };

  const getStatus = (id: string, original: string) => {
    if (doneIds.has(id)) return "done" as const;
    if (dismissedIds.has(id)) return "dismissed" as const;
    return original as "pending" | "done" | "dismissed";
  };

  return { markDone, dismiss, getStatus, loaded, reset, doneIds, dismissedIds };
}
