import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadJson<T>(relativePath: string): T {
  const path = join(ROOT, relativePath);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export interface IntentRule {
  id: string;
  patterns: string[];
  intent: string;
  mode: "A" | "B";
  mode_b_patterns?: string[];
  sub_minds: string[];
  needs_citations: boolean;
  needs_tools: boolean;
  refuse: boolean;
  corpus_topics?: string[];
  response_template?: string;
}

export interface BuddyConfig {
  constitution: {
    forbidden_phrases: string[];
    escalate_ca_intents: string[];
    escalate_ca_modes: string[];
    escalate_ca_query_patterns: string[];
  };
  intentRules: {
    refusal_rules: IntentRule[];
    intent_rules: IntentRule[];
    default: Omit<IntentRule, "id" | "patterns">;
  };
  refusals: Record<string, { answer: string; escalate_to_ca: boolean }>;
  responseTemplates: Record<string, string>;
  actionCardTemplates: Record<
    string,
    {
      type: string;
      title: string;
      subtitle: string;
      savings_field?: string;
      deadline_field?: string;
    }
  >;
  sectorMap: {
    sector_rules: Array<{
      sector_id: string;
      label: string;
      query_patterns: string[];
      holding_patterns?: string[];
      asset_types?: string[];
    }>;
    asset_type_labels: Record<string, string>;
    portfolio_display: { top_holdings_count: number };
  };
  runtime: {
    retrieval: { top_k: number; min_score: number };
    tool_bindings: Record<string, string[]>;
    exemption_options: string[];
    defaults: {
      projected_tax_inr: number;
      property_sale_inr: number;
      old_regime_deductions_inr: number;
      gross_income_factor_of_networth: number;
    };
  };
}

let cached: BuddyConfig | null = null;

export function getBuddyConfig(rootDir?: string): BuddyConfig {
  if (cached && !rootDir) return cached;
  const base = rootDir ?? ROOT;
  const load = <T>(p: string) => JSON.parse(readFileSync(join(base, p), "utf-8")) as T;

  const config: BuddyConfig = {
    constitution: load("config/constitution.json"),
    intentRules: load("config/intent-rules.json"),
    refusals: load<{ refusals: BuddyConfig["refusals"] }>("config/refusals.json").refusals,
    responseTemplates: load("config/response-templates.json"),
    actionCardTemplates: load("config/action-card-templates.json"),
    sectorMap: load("config/sector-map.json"),
    runtime: load("config/runtime.json"),
  };

  if (!rootDir) cached = config;
  return config;
}

export function resetBuddyConfigCache(): void {
  cached = null;
}

export function listCorpusFiles(rootDir?: string): string[] {
  const base = join(rootDir ?? ROOT, "corpus");
  const files: string[] = [];
  for (const sub of ["regulatory", "strategies"]) {
    const dir = join(base, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".json")) files.push(join(dir, f));
    }
  }
  return files;
}
