import type { IntentCategory } from "@capstone/types";
import { ARCHITECT_FALLBACK } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";

export function buildRefusalAnswer(
  _query: string,
  intent: IntentCategory,
): Pick<import("@capstone/types").CaBuddyResponse, "answer" | "citations" | "tool_traces" | "action_card" | "escalate_to_ca" | "refused"> {
  const entry = getBuddyConfig().refusals[intent];
  if (entry) {
    return {
      answer: entry.answer,
      citations: [],
      tool_traces: [],
      escalate_to_ca: entry.escalate_to_ca,
      refused: true,
    };
  }
  return {
    answer: ARCHITECT_FALLBACK,
    citations: [],
    tool_traces: [],
    escalate_to_ca: true,
    refused: true,
  };
}
