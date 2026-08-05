import type { Section54FInput, Section54FResult } from "@capstone/types";

/**
 * Section 54F — capital gains exemption on sale of any long-term asset
 * (other than residential house) when net consideration reinvested in residential house.
 * CA review flag always set — contested positions common.
 */
export function computeSection54F(input: Section54FInput): Section54FResult {
  const notes: string[] = [];
  let eligible = true;

  if (!input.is_residential_property) {
    notes.push("Reinvestment must be in one residential house in India.");
  }
  if (input.owns_multiple_residential) {
    eligible = false;
    notes.push("Assessee owns more than one residential house — 54F eligibility may be restricted.");
  }
  if (input.ltcg_inr <= 0) {
    return {
      eligible: false,
      exempt_amount_inr: 0,
      taxable_ltcg_inr: 0,
      requires_ca_review: true,
      notes: ["No long-term capital gain to exempt."],
    };
  }

  const proportion = Math.min(1, input.reinvestment_inr / input.net_consideration_inr);
  const exemptAmount = Math.round(input.ltcg_inr * proportion);
  const taxableLtcg = input.ltcg_inr - exemptAmount;

  if (proportion < 1) {
    notes.push("Partial reinvestment — proportional exemption under Section 54F.");
  }
  notes.push("Deposit in Capital Gains Account Scheme if reinvestment window not yet complete.");
  notes.push("Consult your CA before claiming exemption — conditions on ownership and timelines apply.");

  return {
    eligible: eligible && exemptAmount > 0,
    exempt_amount_inr: exemptAmount,
    taxable_ltcg_inr: taxableLtcg,
    requires_ca_review: true,
    notes,
  };
}
