import type {
  CaBuddyActionCardDraft,
  CalendarEvent,
  FyDecision,
  FyTaxMath,
  PortfolioContext,
} from "@capstone/types";

export function planFyDecisions(input: {
  portfolio: PortfolioContext;
  taxMath: FyTaxMath;
  calendar: CalendarEvent[];
}): { decisions: FyDecision[]; actionCards: CaBuddyActionCardDraft[]; escalate_to_ca: boolean } {
  const { portfolio, taxMath, calendar } = input;
  const decisions: FyDecision[] = [];
  const actionCards: CaBuddyActionCardDraft[] = [];
  let escalate = false;

  if (taxMath.advance_tax?.advance_tax_required) {
    const at = taxMath.advance_tax;
    decisions.push({
      id: "dec-advance-tax",
      topic: "Advance tax",
      recommendation: `Pay Q${at.current_quarter} advance tax instalment of ₹${at.instalment_due_inr.toLocaleString("en-IN")} by ${at.due_by} (suggestion only).`,
      rationale: `Net liability ₹${at.net_liability_inr.toLocaleString("en-IN")}; 234C interest risk ₹${at.interest_234c_inr.toLocaleString("en-IN")} if deferred.`,
      confidence: "high",
      escalate_to_ca: false,
      required_citations: ["Section 208", "Section 234C"],
    });
    actionCards.push({
      type: "advance_tax",
      title: `Pay Q${at.current_quarter} advance tax`,
      subtitle: "Instalment due — pay via challan ITNS 280 externally",
      details: decisions[decisions.length - 1].recommendation,
      savings_inr: at.interest_234c_inr,
      deadline: at.due_by,
    });
  }

  if (taxMath.harvest && taxMath.harvest.pairs.length > 0) {
    const h = taxMath.harvest;
    decisions.push({
      id: "dec-harvest",
      topic: "Tax-loss harvest",
      recommendation: `Review ${h.pairs.length} harvest pair(s); estimated tax save ₹${h.total_tax_saved_inr.toLocaleString("en-IN")}. Execute sells on your broker — instructions only.`,
      rationale: `Unpaired losses ₹${h.unpaired_losses_inr.toLocaleString("en-IN")}; unpaired gains ₹${h.unpaired_gains_inr.toLocaleString("en-IN")}.`,
      confidence: "high",
      escalate_to_ca: false,
      required_citations: ["Section 111A"],
    });
    actionCards.push({
      type: "harvest",
      title: "Execute harvest offset (instructions only)",
      subtitle: "Sell loss lots to offset gains on your broker",
      details: decisions[decisions.length - 1].recommendation,
      savings_inr: h.total_tax_saved_inr,
    });
  }

  if (portfolio.open_mismatches > 0) {
    decisions.push({
      id: "dec-firewall",
      topic: "Tax Firewall",
      recommendation: `Reconcile ${portfolio.open_mismatches} open AIS/ledger mismatch(es) before filing season.`,
      rationale: `Firewall status: ${portfolio.firewall_status}. Mismatches are reconciliation flags, not evidence of evasion.`,
      confidence: "high",
      escalate_to_ca: portfolio.firewall_status === "critical",
      required_citations: ["AIS"],
    });
    actionCards.push({
      type: "firewall_fix",
      title: "Resolve Tax Firewall mismatches",
      subtitle: `${portfolio.open_mismatches} open item(s) — instruction-only`,
      details: decisions[decisions.length - 1].recommendation,
    });
    if (portfolio.firewall_status === "critical") escalate = true;
  }

  if (taxMath.regime_compare) {
    const r = taxMath.regime_compare;
    decisions.push({
      id: "dec-regime",
      topic: "Tax regime",
      recommendation: `Model suggests ${r.recommended} regime (saves ₹${r.savings_inr.toLocaleString("en-IN")} vs alternative). Confirm with your CA before switching.`,
      rationale: `Old ₹${r.old_regime.total_tax_inr.toLocaleString("en-IN")} vs new ₹${r.new_regime.total_tax_inr.toLocaleString("en-IN")}.`,
      confidence: "medium",
      escalate_to_ca: true,
      required_citations: [],
    });
    escalate = true;
  }

  if ((portfolio.property_assets?.length ?? 0) > 0) {
    decisions.push({
      id: "dec-property",
      topic: "Property / capital gains pathways",
      recommendation: "Review Section 54 / 54EC / 54F pathways before any RE exit. Contested — consult your CA.",
      rationale: `${portfolio.property_assets!.length} property holding(s) in portfolio context.`,
      confidence: "medium",
      escalate_to_ca: true,
      required_citations: ["Section 54", "Section 54EC"],
    });
    escalate = true;
  }

  if (portfolio.entity_count >= 2) {
    decisions.push({
      id: "dec-entity-web",
      topic: "Entity-web planning",
      recommendation: "Run annual person/HUF/trust/company allocation review including clubbing risk. Mode B — consult your CA.",
      rationale: `${portfolio.entity_count} entities: ${portfolio.entities_summary.join(", ")}.`,
      confidence: "medium",
      escalate_to_ca: true,
      required_citations: ["Section 64"],
    });
    escalate = true;
  }

  for (const ev of calendar) {
    if (ev.escalate_to_ca) escalate = true;
  }

  return { decisions, actionCards, escalate_to_ca: escalate };
}
