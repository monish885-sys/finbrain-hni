export {
  PORTAL_IDS,
  isPortalId,
  type PortalDefinition,
  type PortalId,
  type PortalPersona,
  type PortalRouteId,
} from "./portals";

export {
  ANTI_GOALS_VERSION,
  ARCHITECT_FALLBACK,
  ARCHITECT_RULES,
  CARDINAL_NEVERS,
  INSTRUCTION_ONLY_ACTION_TYPES,
  PLATFORM_DISCLAIMER,
  type AntiGoalCategory,
} from "./anti-goals";

export type { AskAiRequest, AskAiResponse, HealthResponse } from "./api";

export type {
  AdvanceTaxInput,
  AdvanceTaxResult,
  AssetClass,
  Brainset,
  BrainsetStatus,
  CalendarEvent,
  CalendarEventCategory,
  CalendarPriority,
  CaBuddyActionCardDraft,
  CaBuddyResponse,
  CaReviewAction,
  CaReviewDecision,
  CaReviewPack,
  CgLotInput,
  CgLotResult,
  DayPlan,
  DayPlanItem,
  DayPlanItemCategory,
  DayPlanItemStatus,
  DayPlanStatus,
  FyDecision,
  FyEntityView,
  FyReport,
  FyTaxMath,
  GoldenScenario,
  HarvestLot,
  HarvestPairResult,
  HniApprovalAction,
  HniApprovalDecision,
  IntentCategory,
  PortfolioContext,
  RagCitation,
  ReasoningMode,
  RegimeCompareInput,
  RegimeCompareResult,
  Section54FInput,
  Section54FResult,
  SubMind,
  TaxRegime,
  TaxSlabInput,
  TaxSlabResult,
  ToolTrace,
} from "./ca-buddy";

export type EntityType = "individual" | "huf" | "private_trust" | "pvt_ltd" | "joint";

export type AssetType =
  | "equity"
  | "mf"
  | "fd"
  | "pms"
  | "aif"
  | "re"
  | "gold"
  | "insurance"
  | "loan"
  | "cash"
  | "other";

export type AssetSource = "aa" | "cas" | "manual" | "document_ai";

export type ActionCardType =
  | "harvest"
  | "firewall_fix"
  | "nominee_fix"
  | "manager_alert"
  | "advance_tax";

export type ActionCardStatus = "pending" | "done" | "dismissed";

export type MismatchSeverity = "critical" | "warning" | "info";

export type MismatchType =
  | "missing_income"
  | "wrong_classification"
  | "tds_not_claimed"
  | "duplicate_reporting"
  | "schedule_fa_gap"
  | "schedule_al_gap";

export interface Person {
  id: string;
  type: "individual";
  name: string;
  pan: string;
  net_worth_inr: number;
  role?: "principal" | "spouse" | "parent" | "child";
}

export interface LegalEntity {
  id: string;
  type: "huf" | "private_trust" | "pvt_ltd";
  name: string;
  pan: string;
  net_worth_inr: number;
  karta?: string;
}

export type Entity = Person | LegalEntity;

export interface AssetClassBreakdown {
  equity: number;
  debt: number;
  re: number;
  alts: number;
  cash: number;
}

export interface Family {
  family_id: string;
  name: string;
  total_net_worth_inr: number;
  delta_today_inr: number;
  delta_month_inr: number;
  tax_saved_ytd_inr: number;
  held_away_pct: number;
  primary_bank: string;
  entities: Entity[];
  asset_classes: AssetClassBreakdown;
  last_sync: string;
  nominee_gaps: number;
  entity_count: number;
}

export interface Lot {
  lot_id: string;
  quantity: number;
  buy_date: string;
  buy_price_inr: number;
  current_price_inr: number;
  gain_loss_inr: number;
  gain_type: "stcg" | "ltcg" | "none";
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  custodian: string;
  held_by_entity_id: string;
  quantity: number;
  current_value_inr: number;
  cost_basis_inr: number;
  gain_loss_inr: number;
  gain_type: "stcg" | "ltcg" | "none";
  lots: Lot[];
  source: AssetSource;
}

export interface NetWorthPoint {
  date: string;
  value_inr: number;
}

export interface FirewallStatus {
  status: "clean" | "attention" | "critical";
  last_scan: string;
  ais_entries_checked: number;
  matched: number;
  needs_attention: number;
}

export interface Mismatch {
  id: string;
  type: MismatchType;
  severity: MismatchSeverity;
  title: string;
  description: string;
  amount_inr: number;
  institution: string;
  suggested_fix: string;
  ais_reference?: string;
}

export interface FirewallData {
  status: FirewallStatus;
  mismatches: Mismatch[];
}

export interface HarvestInstruction {
  action: "sell" | "buy" | "transfer";
  symbol: string;
  quantity: number;
  account: string;
  lot_id?: string;
  loss_inr?: number;
  offsets?: string;
}

export interface ActionCard {
  id: string;
  type: ActionCardType;
  status: ActionCardStatus;
  title: string;
  subtitle: string;
  savings_inr: number;
  deadline: string;
  priority: "high" | "medium" | "low";
  instructions?: HarvestInstruction[];
  tax_without_action_inr?: number;
  tax_with_action_inr?: number;
  details?: string;
  mismatch_id?: string;
}

export interface ArchitectCitation {
  source: string;
  section: string;
  text: string;
}

export interface ArchitectResponse {
  id: string;
  prompt: string;
  answer: string;
  citations: ArchitectCitation[];
  action_card_id?: string;
  follow_up_prompts?: string[];
}

export interface ArchitectData {
  suggested_prompts: string[];
  responses: Record<string, ArchitectResponse>;
}

export interface DailyGlance {
  action_cards_pending: number;
  advance_tax_due_days: number;
  advance_tax_amount_inr: number;
  firewall_status: "clean" | "attention" | "critical";
  firewall_last_checked: string;
}

export interface WalletShare {
  institution: string;
  pct: number;
}

export interface HonestyCheckTeaser {
  alerts: Array<{
    title: string;
    description: string;
    cost_inr?: number;
  }>;
  pms_rankings: Array<{
    name: string;
    vs_benchmark_pct: number;
    status: "outperformer" | "underperformer";
  }>;
  wallet_share: WalletShare[];
}

export interface TimeMachineTeaser {
  query: string;
  tax_comparison: {
    personal_tax_inr: number;
    huf_tax_inr: number;
    savings_inr: number;
  };
  trade_offs: string[];
  calendar: Array<{ month: string; action: string }>;
}

export interface DemoData {
  family: Family;
  holdings: Holding[];
  net_worth_history: NetWorthPoint[];
  firewall: FirewallData;
  action_cards: ActionCard[];
  architect: ArchitectData;
  daily_glance: DailyGlance;
  honesty_check: HonestyCheckTeaser;
  time_machine: TimeMachineTeaser;
}
