import { getArchitectResponse } from "@capstone/demo-data";
import {
  ARCHITECT_FALLBACK,
  type ArchitectResponse,
  type AskAiResponse,
  type CaBuddyResponse,
} from "@capstone/types";
import { getAuthMode, isLiveApiEnabled } from "@/lib/live-api";

function mapFinToArchitect(query: string, fin: CaBuddyResponse): ArchitectResponse {
  return {
    id: `fin-${fin.intent}`,
    prompt: query,
    answer: fin.answer,
    citations: fin.citations.map((c) => ({
      source: c.source,
      section: c.section,
      text: c.text,
    })),
    follow_up_prompts: fin.escalate_to_ca
      ? ["Show me today's Day Plan", "What should I discuss with my CA?"]
      : undefined,
  };
}

function familyIdFromStorage(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("capstone_family_id") ?? undefined;
}

export function setFinFamilyId(familyId: string | null) {
  if (typeof window === "undefined") return;
  if (familyId) window.localStorage.setItem("capstone_family_id", familyId);
  else window.localStorage.removeItem("capstone_family_id");
}

/**
 * Ask Fin via Next BFF (`/api/ai/ask`). Falls back to seeded demo JSON only in demo mode.
 */
export async function askArchitect(query: string): Promise<{
  response: ArchitectResponse;
  source: "fin" | "demo";
}> {
  const authMode = getAuthMode();
  const familyId =
    familyIdFromStorage() ??
    (authMode === "demo" || !isLiveApiEnabled() ? "fam_kapoor_001" : undefined);

  try {
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        deterministic: true,
        portfolio: authMode === "live" ? "live" : "demo",
        familyId,
      }),
    });

    if (!res.ok) throw new Error(`ask failed: ${res.status}`);

    const data = (await res.json()) as AskAiResponse;
    if (!data?.response?.answer) throw new Error("malformed ask response");

    return {
      response: mapFinToArchitect(query, data.response),
      source: "fin",
    };
  } catch {
    if (authMode === "live") {
      return {
        response: {
          id: "live-unavailable",
          prompt: query,
          answer:
            "Fin is temporarily unavailable. Your portfolio data remains in God Mode — try again shortly, or consult your CA for time-sensitive tax questions.",
          citations: [],
        },
        source: "demo",
      };
    }
    const seeded = getArchitectResponse(query);
    return {
      response:
        seeded ??
        ({
          id: "fallback",
          prompt: query,
          answer: ARCHITECT_FALLBACK,
          citations: [],
        } satisfies ArchitectResponse),
      source: "demo",
    };
  }
}
