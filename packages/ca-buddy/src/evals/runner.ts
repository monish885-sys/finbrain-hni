import type { DailyGlance, Family, FirewallData, GoldenScenario, Holding } from "@capstone/types";
import { dailyGlance, family, firewall, holdings } from "@capstone/demo-data";
import { buildPortfolioContext } from "../context/portfolio";
import { askSync, validateResponse } from "../orchestrator/ask";
import { classifyIntent } from "../orchestrator/classifier";
import { CALCULATOR_REGISTRY } from "../calculators";
import { loadGoldenScenariosFromDisk } from "./load-scenarios";

export interface EvalResult {
  id: string;
  passed: boolean;
  errors: string[];
}

export function loadGoldenScenarios(): GoldenScenario[] {
  return loadGoldenScenariosFromDisk();
}

export function runDeterministicEval(): { results: EvalResult[]; passRate: number } {
  const scenarios = loadGoldenScenarios();
  const portfolio = buildPortfolioContext({
    family: family as Family,
    holdings: holdings as Holding[],
    firewall: firewall as FirewallData,
    dailyGlance: dailyGlance as DailyGlance,
  });
  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    const errors: string[] = [];

    const classification = classifyIntent(scenario.query);
    if (classification.mode !== scenario.mode) {
      errors.push(`Mode mismatch: got ${classification.mode}, expected ${scenario.mode}`);
    }

    const expectedMinds = new Set(scenario.sub_minds);
    const gotMinds = new Set(classification.sub_minds);
    for (const mind of expectedMinds) {
      if (!gotMinds.has(mind)) errors.push(`Missing sub-mind: ${mind}`);
    }

    if (scenario.expect_refused && !classification.refuse) {
      errors.push("Expected refusal but query was not refused");
    }

    if (scenario.tool_inputs && scenario.tool_expectations) {
      for (const [toolName, inputs] of Object.entries(scenario.tool_inputs)) {
        const calc = CALCULATOR_REGISTRY[toolName as keyof typeof CALCULATOR_REGISTRY];
        if (!calc) {
          errors.push(`Unknown calculator: ${toolName}`);
          continue;
        }
        const output = calc(inputs as never);
        const expected = scenario.tool_expectations[toolName];
        if (expected) {
          const outputRecord = output as unknown as Record<string, unknown>;
          for (const [key, val] of Object.entries(expected)) {
            const actual = outputRecord[key];
            if (actual !== val) {
              errors.push(`Tool ${toolName}.${key}: got ${actual}, expected ${val}`);
            }
          }
        }
      }
    }

    const response = askSync(scenario.query, { portfolio, deterministic: true });

    const calculatorOnly = Boolean(scenario.tool_inputs && !scenario.required_tools.length);

    if (!calculatorOnly) {
      if (scenario.expect_refused && !response.refused) {
        errors.push("Response not refused");
      }

      if (scenario.expect_action_card && !response.action_card) {
        errors.push("Expected action card but none emitted");
      }

      if (scenario.expect_day_plan && !response.day_plan) {
        errors.push("Expected day_plan but none emitted");
      }

      if (scenario.expect_ca_review_pack && !response.ca_review_pack) {
        errors.push("Expected ca_review_pack but none emitted");
      }

      if (scenario.expect_escalate_ca && !response.escalate_to_ca) {
        errors.push("Expected escalate_to_ca flag");
      }

      for (const phrase of scenario.forbidden_phrases) {
        if (response.answer.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Forbidden phrase in answer: ${phrase}`);
        }
      }

      const validation = validateResponse(response, scenario.required_citation_patterns);
      if (!validation.valid) errors.push(...validation.errors);

      for (const tool of scenario.required_tools) {
        if (!response.tool_traces.some((t) => t.tool === tool)) {
          errors.push(`Missing required tool trace: ${tool}`);
        }
      }
    }

    results.push({ id: scenario.id, passed: errors.length === 0, errors });
  }

  const passed = results.filter((r) => r.passed).length;
  const passRate = scenarios.length > 0 ? passed / scenarios.length : 0;

  return { results, passRate };
}
