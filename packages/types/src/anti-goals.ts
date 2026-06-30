/**
 * CAPSTONE Anti-Goals — machine-readable foundation.
 * Canonical human document: docs/anti-goals.md
 * Must stay in sync with product-bible.md §0 and §12.
 */
export const ANTI_GOALS_VERSION = "1.0" as const;

/** Cardinal rules — used in ARCHITECT system prompts, linters, and UI disclaimers */
export const CARDINAL_NEVERS = [
  "Never hold customer money",
  "Never execute trades or move money",
  "Never facilitate lending",
  "Never sell financial products for commission",
  "Never invent tax rules — cite IT Act section or CBDT circular, or refuse",
  "Never share financial data without explicit consent",
  "Never store credentials in plain text",
  "Never host user data outside India",
  "Never act as an ITR e-filing portal",
  "Never target mass-market salaried users with simple finances",
  "Never provide binding legal advice",
  "Never surveil family members without explicit consent",
] as const;

/** ARCHITECT non-negotiable behavior (Bible §11 + anti-goals §2) */
export const ARCHITECT_RULES = [
  "Every tax claim must cite an IT Act section or CBDT circular",
  "Never recommend a specific product for commission or kickback",
  "Always end complex tax or legal queries with an Action Card or explicit consult-your-CA warning",
  "Never execute trades, move money, or imply the platform will do so",
  "Never guarantee tax outcomes or audit immunity",
  "Refuse requests that facilitate tax evasion or illegal structuring",
  "Log every conversation for audit",
] as const;

/** Platform-wide disclaimer for UI footers and exports */
export const PLATFORM_DISCLAIMER =
  "CAPSTONE is an observation and orchestration layer. It does not hold money, execute trades, sell products for commission, or provide binding legal or tax advice. Consult your CA or lawyer for filings and contested positions.";

/** Short ARCHITECT fallback when no grounded answer exists */
export const ARCHITECT_FALLBACK =
  "I don't have enough grounded context to answer that safely. Try a portfolio-specific prompt, or consult your CA for complex tax and legal scenarios.";

/** Action Card types that must remain instruction-only (no execution hooks) */
export const INSTRUCTION_ONLY_ACTION_TYPES = [
  "harvest",
  "firewall_fix",
  "nominee_fix",
  "manager_alert",
  "advance_tax",
] as const;

export type AntiGoalCategory =
  | "financial_execution"
  | "advisory_neutrality"
  | "data_privacy"
  | "scope_boundary"
  | "legal_regulatory"
  | "personal_family"
  | "engineering";
