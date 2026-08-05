import type {
  CaReviewDecision,
  DayPlan,
  DayPlanItem,
  DayPlanStatus,
  HniApprovalDecision,
} from "@capstone/types";

function refreshPlanStatus(items: DayPlanItem[]): DayPlanStatus {
  if (items.length === 0) return "closed";
  const openProposed = items.some((i) => i.status === "proposed" || i.status === "ca_edited");
  const awaitingHni = items.some((i) => i.status === "ca_approved");
  const anyCleared = items.some((i) => i.status === "hni_approved" || i.status === "hni_dismissed");
  const allTerminal = items.every((i) =>
    ["ca_rejected", "hni_approved", "hni_dismissed"].includes(i.status),
  );

  if (allTerminal) return "closed";
  if (openProposed) return "awaiting_ca";
  if (awaitingHni) return "awaiting_hni";
  if (anyCleared) return "partially_cleared";
  return "awaiting_ca";
}

/**
 * CA reviews Day Plan items. Approve → ready for HNI; edit → still CA-cleared with notes; reject → closed for that item.
 * Never auto-executes Action Cards.
 */
export function applyCaReview(plan: DayPlan, decisions: CaReviewDecision[]): DayPlan {
  const byId = new Map(decisions.map((d) => [d.item_id, d]));
  const now = new Date().toISOString();

  const items = plan.items.map((item) => {
    const decision = byId.get(item.id);
    if (!decision) return item;

    if (decision.action === "reject") {
      return {
        ...item,
        status: "ca_rejected" as const,
        ca_note: decision.note ?? "Rejected by CA",
      };
    }

    if (decision.action === "edit") {
      return {
        ...item,
        status: "ca_approved" as const,
        title: decision.edited_title ?? item.title,
        details: decision.edited_details ?? item.details,
        ca_note: decision.note ?? "Edited and approved by CA",
        action_card: item.action_card
          ? {
              ...item.action_card,
              title: decision.edited_title ?? item.action_card.title,
              details: decision.edited_details ?? item.action_card.details,
            }
          : item.action_card,
      };
    }

    return {
      ...item,
      status: "ca_approved" as const,
      ca_note: decision.note ?? "Approved by CA",
    };
  });

  return {
    ...plan,
    items,
    status: refreshPlanStatus(items),
    updated_at: now,
  };
}

/**
 * HNI approves or dismisses CA-cleared items. Approval unlocks instruction-only Action Cards for the human to execute externally.
 */
export function applyHniApproval(plan: DayPlan, decisions: HniApprovalDecision[]): DayPlan {
  const byId = new Map(decisions.map((d) => [d.item_id, d]));
  const now = new Date().toISOString();

  const items = plan.items.map((item) => {
    const decision = byId.get(item.id);
    if (!decision) return item;
    if (item.status !== "ca_approved" && item.status !== "ca_edited") {
      return item;
    }

    if (decision.action === "dismiss") {
      return {
        ...item,
        status: "hni_dismissed" as const,
        hni_note: decision.note ?? "Dismissed by HNI",
      };
    }

    return {
      ...item,
      status: "hni_approved" as const,
      hni_note: decision.note ?? "Approved by HNI — execute externally",
    };
  });

  return {
    ...plan,
    items,
    status: refreshPlanStatus(items),
    updated_at: now,
  };
}

/** Action Cards cleared for HNI external execution after dual approval */
export function hniClearedActionCards(plan: DayPlan) {
  return plan.items
    .filter((i) => i.status === "hni_approved" && i.action_card)
    .map((i) => i.action_card!);
}
