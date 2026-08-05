import type { IntentCategory, ReasoningMode, SubMind } from "@capstone/types";
import { getBuddyConfig, type IntentRule } from "../config/loader";

export interface ClassificationResult {
  intent: IntentCategory;
  mode: ReasoningMode;
  sub_minds: SubMind[];
  needs_citations: boolean;
  needs_tools: boolean;
  refuse: boolean;
  response_template?: string;
  corpus_topics?: string[];
  matched_rule_id?: string;
}

function matchPatterns(query: string, patterns: string[]): boolean {
  const q = query.toLowerCase();
  return patterns.some((p) => new RegExp(p, "i").test(q) || new RegExp(p, "i").test(query));
}

function ruleToResult(rule: IntentRule, query: string): ClassificationResult {
  let mode: ReasoningMode = rule.mode;
  if (rule.mode_b_patterns?.length && matchPatterns(query, rule.mode_b_patterns)) {
    mode = "B";
  }
  return {
    intent: rule.intent as IntentCategory,
    mode,
    sub_minds: rule.sub_minds as SubMind[],
    needs_citations: rule.needs_citations,
    needs_tools: rule.needs_tools,
    refuse: rule.refuse,
    response_template: rule.response_template,
    corpus_topics: rule.corpus_topics,
    matched_rule_id: rule.id,
  };
}

export function classifyIntent(query: string): ClassificationResult {
  const { intentRules } = getBuddyConfig();

  for (const rule of intentRules.refusal_rules) {
    if (matchPatterns(query, rule.patterns)) return ruleToResult(rule, query);
  }

  for (const rule of intentRules.intent_rules) {
    if (matchPatterns(query, rule.patterns)) return ruleToResult(rule, query);
  }

  const d = intentRules.default;
  return {
    intent: d.intent as IntentCategory,
    mode: d.mode,
    sub_minds: d.sub_minds as SubMind[],
    needs_citations: d.needs_citations,
    needs_tools: d.needs_tools,
    refuse: d.refuse,
  };
}
