/** CA Buddy brain contracts — shared across calculators, orchestrator, and API */

export type ReasoningMode = "A" | "B";

export type SubMind =
  | "statutory_tax"
  | "accounting"
  | "wealth"
  | "corporate_fema"
  | "risk"
  | "calendar";

export type IntentCategory =
  | "tax_calculation"
  | "regime_compare"
  | "capital_gains"
  | "section_54f"
  | "advance_tax"
  | "harvest"
  | "firewall"
  | "structuring"
  | "portfolio"
  | "fy_analysis"
  | "desk_day_plan"
  | "ca_memo"
  | "refuse_evasion"
  | "refuse_execution"
  | "refuse_product"
  | "refuse_scope"
  | "general";

/** Shared bible is config/corpus; brainset is per-portfolio Fin state */
export type BrainsetStatus = "active" | "paused" | "demo";

export type DayPlanItemStatus =
  | "proposed"
  | "ca_approved"
  | "ca_edited"
  | "ca_rejected"
  | "hni_approved"
  | "hni_dismissed";

export type DayPlanItemCategory =
  | "advance_tax"
  | "firewall"
  | "harvest"
  | "nominee"
  | "calendar"
  | "structuring"
  | "portfolio"
  | "risk";

export interface DayPlanItem {
  id: string;
  category: DayPlanItemCategory;
  priority: CalendarPriority;
  title: string;
  details: string;
  rationale: string;
  sub_buddy: SubMind;
  escalate_to_ca: boolean;
  status: DayPlanItemStatus;
  action_card?: CaBuddyActionCardDraft;
  required_citations: string[];
  ca_note?: string;
  hni_note?: string;
}

export type DayPlanStatus =
  | "draft"
  | "awaiting_ca"
  | "awaiting_hni"
  | "partially_cleared"
  | "closed";

export interface DayPlan {
  id: string;
  brainset_id: string;
  as_of_date: string;
  financial_year: string;
  status: DayPlanStatus;
  summary: string;
  items: DayPlanItem[];
  citations: RagCitation[];
  tool_traces: ToolTrace[];
  created_at: string;
  updated_at: string;
}

export type CaReviewAction = "approve" | "edit" | "reject";

export interface CaReviewDecision {
  item_id: string;
  action: CaReviewAction;
  note?: string;
  edited_title?: string;
  edited_details?: string;
}

export type HniApprovalAction = "approve" | "dismiss";

export interface HniApprovalDecision {
  item_id: string;
  action: HniApprovalAction;
  note?: string;
}

export interface CaReviewPack {
  day_plan_id: string;
  brainset_id: string;
  family_name: string;
  as_of_date: string;
  items_awaiting_ca: DayPlanItem[];
  summary: string;
  disclaimer: string;
}

export interface Brainset {
  id: string;
  family_id: string;
  family_name: string;
  status: BrainsetStatus;
  portfolio: PortfolioContext;
  financial_year: string;
  calendar: CalendarEvent[];
  open_day_plan_ids: string[];
  ca_prefs?: {
    auto_escalate_structuring: boolean;
    notify_email?: string;
  };
  last_desk_run_at?: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventCategory =
  | "advance_tax"
  | "tds"
  | "ais_firewall"
  | "harvest"
  | "nominee"
  | "mca"
  | "fema"
  | "property"
  | "structuring"
  | "general";

export type CalendarPriority = "high" | "medium" | "low";

export interface CalendarEvent {
  id: string;
  category: CalendarEventCategory;
  due_date: string;
  priority: CalendarPriority;
  title: string;
  details: string;
  escalate_to_ca: boolean;
  related_entity_ids?: string[];
}

export interface FyDecision {
  id: string;
  topic: string;
  recommendation: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
  escalate_to_ca: boolean;
  required_citations: string[];
}

export interface FyEntityView {
  name: string;
  type_hint: string;
  note: string;
}

export interface FyTaxMath {
  advance_tax?: AdvanceTaxResult;
  regime_compare?: RegimeCompareResult;
  harvest?: HarvestPairResult;
  property_cg?: CgLotResult[];
}

export interface FyReport {
  financial_year: string;
  as_of_date: string;
  family_name: string;
  summary: string;
  entity_views: FyEntityView[];
  tax_math: FyTaxMath;
  calendar: CalendarEvent[];
  decisions: FyDecision[];
  action_cards: CaBuddyActionCardDraft[];
  citations: RagCitation[];
  tool_traces: ToolTrace[];
  escalate_to_ca: boolean;
  disclaimer: string;
}

export interface ToolTrace {
  tool: string;
  inputs_hash: string;
  output: unknown;
}

export interface RagCitation {
  chunk_id: string;
  source: string;
  section: string;
  text: string;
  score: number;
}

export interface CaBuddyActionCardDraft {
  type: "harvest" | "firewall_fix" | "advance_tax" | "nominee_fix" | "manager_alert" | "structuring" | "desk_task";
  title: string;
  subtitle: string;
  details: string;
  savings_inr?: number;
  deadline?: string;
}

export interface CaBuddyResponse {
  answer: string;
  citations: RagCitation[];
  tool_traces: ToolTrace[];
  action_card?: CaBuddyActionCardDraft;
  day_plan?: DayPlan;
  ca_review_pack?: CaReviewPack;
  escalate_to_ca: boolean;
  refused: boolean;
  mode: ReasoningMode;
  sub_minds: SubMind[];
  intent: IntentCategory;
  disclaimer: string;
}

export interface PortfolioContext {
  family_name: string;
  total_net_worth_inr: number;
  entity_count: number;
  entities_summary: string[];
  holdings_summary: string[];
  firewall_status: string;
  open_mismatches: number;
  sector_exposure?: Record<string, number>;
  /** Full harvest lots from holdings — used by tool resolver */
  harvest_lots?: HarvestLot[];
  /** Tax signals from ledger / daily glance */
  tax_signals?: {
    advance_tax_amount_inr?: number;
    advance_tax_due_days?: number;
    projected_total_tax_inr?: number;
    tds_credited_inr?: number;
    advance_tax_paid_inr?: number;
    as_of_date?: string;
    financial_year?: string;
  };
  /** Holdings grouped by sector id from sector-map config */
  holdings_by_sector?: Record<string, string[]>;
  /** Real estate holdings for property CG tools */
  property_assets?: Array<{
    name: string;
    value_inr: number;
    cost_inr: number;
    purchase_date?: string;
  }>;
  /** Estimated gross income for regime compare when not in query */
  estimated_gross_income_inr?: number;
  old_regime_deductions_inr?: number;
  nominee_gaps?: number;
}

export interface GoldenScenario {
  id: string;
  query: string;
  mode: ReasoningMode;
  sub_minds: SubMind[];
  required_tools: string[];
  required_citation_patterns: string[];
  expect_action_card: boolean;
  expect_escalate_ca: boolean;
  expect_refused?: boolean;
  expect_day_plan?: boolean;
  expect_ca_review_pack?: boolean;
  forbidden_phrases: string[];
  fixture_context?: string;
  tool_inputs?: Record<string, unknown>;
  tool_expectations?: Record<string, Record<string, unknown>>;
}

export type TaxRegime = "old" | "new";

export interface TaxSlabInput {
  financial_year: string;
  regime: TaxRegime;
  gross_income_inr: number;
  deductions_inr?: number;
  is_senior_citizen?: boolean;
}

export interface TaxSlabResult {
  taxable_income_inr: number;
  base_tax_inr: number;
  surcharge_inr: number;
  cess_inr: number;
  total_tax_inr: number;
  effective_rate_pct: number;
  regime: TaxRegime;
  financial_year: string;
}

export interface RegimeCompareInput {
  financial_year: string;
  gross_income_inr: number;
  old_regime_deductions_inr: number;
}

export interface RegimeCompareResult {
  old_regime: TaxSlabResult;
  new_regime: TaxSlabResult;
  recommended: TaxRegime;
  savings_inr: number;
}

export type AssetClass = "equity" | "debt" | "property" | "other";

export interface CgLotInput {
  asset_class: AssetClass;
  sale_value_inr: number;
  cost_inr: number;
  purchase_date: string;
  sale_date: string;
  is_listed_equity?: boolean;
  indexation_applicable?: boolean;
}

export interface CgLotResult {
  gain_inr: number;
  gain_type: "stcg" | "ltcg" | "none";
  tax_inr: number;
  holding_months: number;
  exemption_inr: number;
  section: string;
}

export interface AdvanceTaxInput {
  financial_year: string;
  projected_total_tax_inr: number;
  tds_credited_inr: number;
  advance_tax_paid_inr: number;
  as_of_date: string;
}

export interface AdvanceTaxResult {
  net_liability_inr: number;
  advance_tax_required: boolean;
  current_quarter: 1 | 2 | 3 | 4;
  due_by: string;
  instalment_due_inr: number;
  shortfall_inr: number;
  interest_234c_inr: number;
  cumulative_paid_inr: number;
  cumulative_required_inr: number;
}

export interface Section54FInput {
  sale_value_inr: number;
  net_consideration_inr: number;
  ltcg_inr: number;
  reinvestment_inr: number;
  is_residential_property: boolean;
  owns_multiple_residential: boolean;
}

export interface Section54FResult {
  eligible: boolean;
  exempt_amount_inr: number;
  taxable_ltcg_inr: number;
  requires_ca_review: boolean;
  notes: string[];
}

export interface HarvestLot {
  lot_id: string;
  symbol: string;
  gain_loss_inr: number;
  gain_type: "stcg" | "ltcg";
}

export interface HarvestPairResult {
  pairs: Array<{
    loss_lot_id: string;
    gain_lot_id: string;
    offset_inr: number;
  }>;
  total_tax_saved_inr: number;
  unpaired_losses_inr: number;
  unpaired_gains_inr: number;
}
