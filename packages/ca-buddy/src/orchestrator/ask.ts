import { ARCHITECT_FALLBACK, PLATFORM_DISCLAIMER } from "@capstone/types";
import type { CaBuddyActionCardDraft, CaBuddyResponse, PortfolioContext, ToolTrace } from "@capstone/types";
import { getBuddyConfig } from "../config/loader";
import { runToolsForIntent } from "../extraction/tool-resolver";
import { analyzeHniFy, formatFyReportAnswer } from "../fy/analyze";
import {
  buildCaReviewPack,
  createBrainset,
  formatDayPlanAnswer,
  runDailyDesk,
} from "../desk";
import { hasCitationMatch, retrieveCitations } from "../rag/retrieve";
import { classifyIntent } from "./classifier";
import { buildPortfolioAnswer } from "./portfolio-synth";
import { buildRefusalAnswer } from "./refusal";
import { renderTemplate } from "./template-engine";
import { synthesizeAnswer } from "./synthesize";
import { synthesizeWithLlm } from "../llm/adapter";

export interface AskOptions {
  portfolio?: PortfolioContext;
  /** When true, skip external LLM even if configured */
  deterministic?: boolean;
}

function containsForbiddenPhrase(text: string, phrases: string[]): string | null {
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

function shouldEscalateToCa(
  classification: ReturnType<typeof classifyIntent>,
  query: string,
): boolean {
  const { constitution } = getBuddyConfig();
  if (constitution.escalate_ca_modes.includes(classification.mode)) return true;
  if (constitution.escalate_ca_intents.includes(classification.intent)) return true;
  return constitution.escalate_ca_query_patterns.some((p) => new RegExp(p, "i").test(query));
}

function buildActionCard(
  intent: string,
  toolTraces: ToolTrace[],
  answer: string,
): CaBuddyActionCardDraft | undefined {
  const template = getBuddyConfig().actionCardTemplates[intent];
  if (!template || toolTraces.length === 0) return undefined;

  const output = toolTraces[0].output as Record<string, unknown>;
  const title = renderTemplate(template.title, {
    current_quarter: output.current_quarter as number,
  });

  return {
    type: template.type as CaBuddyActionCardDraft["type"],
    title,
    subtitle: template.subtitle,
    details: answer,
    savings_inr: template.savings_field ? (output[template.savings_field] as number) : undefined,
    deadline: template.deadline_field ? (output[template.deadline_field] as string) : undefined,
  };
}

function handleFyAnalysis(
  classification: ReturnType<typeof classifyIntent>,
  portfolio?: PortfolioContext,
): CaBuddyResponse {
  if (!portfolio) {
    return {
      answer:
        "I need portfolio context to run the FY cockpit. Load family holdings and tax signals, then ask again for your financial year plan.",
      citations: [],
      tool_traces: [],
      escalate_to_ca: true,
      refused: false,
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  const report = analyzeHniFy(portfolio, {
    nominee_gaps: portfolio.nominee_gaps,
  });

  return {
    answer: formatFyReportAnswer(report),
    citations: report.citations,
    tool_traces: report.tool_traces,
    action_card: report.action_cards[0],
    escalate_to_ca: report.escalate_to_ca || shouldEscalateToCa(classification, "fy analysis"),
    refused: false,
    mode: classification.mode,
    sub_minds: classification.sub_minds,
    intent: classification.intent,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

function handleDeskDayPlan(
  classification: ReturnType<typeof classifyIntent>,
  portfolio?: PortfolioContext,
): CaBuddyResponse {
  if (!portfolio) {
    return {
      answer:
        "I need a brainset / portfolio context to run the operating desk. Attach demo or live portfolio, then ask for today's Day Plan.",
      citations: [],
      tool_traces: [],
      escalate_to_ca: true,
      refused: false,
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  const brainset = createBrainset({
    family_id: portfolio.family_name.toLowerCase().replace(/\s+/g, "-"),
    portfolio,
    status: "demo",
  });
  const plan = runDailyDesk(brainset);
  const pack = buildCaReviewPack(brainset, plan);
  const firstCard = plan.items.find((i) => i.action_card)?.action_card;

  return {
    answer: formatDayPlanAnswer(plan, pack),
    citations: plan.citations,
    tool_traces: plan.tool_traces,
    action_card: firstCard,
    day_plan: plan,
    ca_review_pack: pack,
    escalate_to_ca: true,
    refused: false,
    mode: classification.mode,
    sub_minds: classification.sub_minds,
    intent: classification.intent,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

function mergeCitationsForIntent(
  intent: string,
  query: string,
  topics?: string[],
): ReturnType<typeof retrieveCitations> {
  const primary = retrieveCitations(query, { topics, topK: 4 });
  if (intent !== "ca_memo" && intent !== "firewall") return primary;

  const grounded = [
    ...retrieveCitations("AIS Form 26AS Tax Firewall mismatch reconcile", {
      topics: ["firewall", "reconciliation", "ais"],
      topK: 3,
    }),
    ...retrieveCitations("advance tax Section 208", { topics: ["advance_tax"], topK: 2 }),
    ...primary,
  ];
  return [...new Map(grounded.map((c) => [c.chunk_id, c])).values()].slice(0, 6);
}

export async function ask(query: string, options: AskOptions = {}): Promise<CaBuddyResponse> {
  const config = getBuddyConfig();
  const classification = classifyIntent(query);

  if (classification.refuse) {
    return {
      ...buildRefusalAnswer(query, classification.intent),
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  if (classification.intent === "fy_analysis") {
    return handleFyAnalysis(classification, options.portfolio);
  }

  if (classification.intent === "desk_day_plan") {
    return handleDeskDayPlan(classification, options.portfolio);
  }

  if (classification.intent === "portfolio" && options.portfolio) {
    return {
      answer: buildPortfolioAnswer(query, options.portfolio),
      citations: retrieveCitations(query, { topics: ["portfolio"] }),
      tool_traces: [],
      escalate_to_ca: false,
      refused: false,
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  const toolTraces = classification.needs_tools
    ? runToolsForIntent(classification.intent, query, options.portfolio)
    : [];

  const citations = classification.needs_citations
    ? mergeCitationsForIntent(classification.intent, query, classification.corpus_topics)
    : [];

  const lawHeavyWithoutCitation =
    classification.needs_citations &&
    citations.length === 0 &&
    toolTraces.length === 0 &&
    classification.intent !== "firewall";

  if (lawHeavyWithoutCitation) {
    return fallbackResponse(classification);
  }

  let answer = synthesizeAnswer({
    query,
    intent: classification.intent,
    citations,
    toolTraces,
    portfolio: options.portfolio,
    responseTemplate: classification.response_template,
    corpusTopics: classification.corpus_topics,
  });

  if (!options.deterministic && process.env.CA_BUDDY_LLM_PROVIDER) {
    const llmAnswer = await synthesizeWithLlm({
      query,
      citations,
      toolTraces,
      templateAnswer: answer,
      mode: classification.mode,
    });
    if (llmAnswer) answer = llmAnswer;
  }

  const forbidden = containsForbiddenPhrase(answer, config.constitution.forbidden_phrases);
  if (forbidden) {
    return fallbackResponse(classification, `Forbidden phrase detected: ${forbidden}`);
  }

  return {
    answer,
    citations,
    tool_traces: toolTraces,
    action_card: buildActionCard(classification.intent, toolTraces, answer),
    escalate_to_ca: shouldEscalateToCa(classification, query),
    refused: false,
    mode: classification.mode,
    sub_minds: classification.sub_minds,
    intent: classification.intent,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

/** Sync wrapper for eval harness and tests */
export function askSync(query: string, options: AskOptions = {}): CaBuddyResponse {
  const config = getBuddyConfig();
  const classification = classifyIntent(query);

  if (classification.refuse) {
    return {
      ...buildRefusalAnswer(query, classification.intent),
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  if (classification.intent === "fy_analysis") {
    return handleFyAnalysis(classification, options.portfolio);
  }

  if (classification.intent === "desk_day_plan") {
    return handleDeskDayPlan(classification, options.portfolio);
  }

  if (classification.intent === "portfolio" && options.portfolio) {
    return {
      answer: buildPortfolioAnswer(query, options.portfolio),
      citations: retrieveCitations(query),
      tool_traces: [],
      escalate_to_ca: false,
      refused: false,
      mode: classification.mode,
      sub_minds: classification.sub_minds,
      intent: classification.intent,
      disclaimer: PLATFORM_DISCLAIMER,
    };
  }

  const toolTraces = classification.needs_tools
    ? runToolsForIntent(classification.intent, query, options.portfolio)
    : [];

  const citations = classification.needs_citations
    ? mergeCitationsForIntent(classification.intent, query, classification.corpus_topics)
    : [];

  const lawHeavyWithoutCitation =
    classification.needs_citations &&
    citations.length === 0 &&
    toolTraces.length === 0 &&
    classification.intent !== "firewall";

  if (lawHeavyWithoutCitation) {
    return fallbackResponse(classification);
  }

  const answer = synthesizeAnswer({
    query,
    intent: classification.intent,
    citations,
    toolTraces,
    portfolio: options.portfolio,
    responseTemplate: classification.response_template,
    corpusTopics: classification.corpus_topics,
  });

  const forbidden = containsForbiddenPhrase(answer, config.constitution.forbidden_phrases);
  if (forbidden) {
    return fallbackResponse(classification, `Forbidden phrase detected: ${forbidden}`);
  }

  return {
    answer,
    citations,
    tool_traces: toolTraces,
    action_card: buildActionCard(classification.intent, toolTraces, answer),
    escalate_to_ca: shouldEscalateToCa(classification, query),
    refused: false,
    mode: classification.mode,
    sub_minds: classification.sub_minds,
    intent: classification.intent,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

function fallbackResponse(
  classification: ReturnType<typeof classifyIntent>,
  reason?: string,
): CaBuddyResponse {
  return {
    answer: reason ? `${ARCHITECT_FALLBACK} (${reason})` : ARCHITECT_FALLBACK,
    citations: [],
    tool_traces: [],
    escalate_to_ca: true,
    refused: false,
    mode: classification.mode,
    sub_minds: classification.sub_minds,
    intent: classification.intent,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

export function validateResponse(
  response: CaBuddyResponse,
  requiredCitationPatterns: string[],
): { valid: boolean; errors: string[] } {
  const config = getBuddyConfig();
  const errors: string[] = [];

  if (response.refused) return { valid: true, errors: [] };

  const forbidden = containsForbiddenPhrase(response.answer, config.constitution.forbidden_phrases);
  if (forbidden) errors.push(`Forbidden phrase: ${forbidden}`);

  if (requiredCitationPatterns.length > 0 && !hasCitationMatch(response.citations, requiredCitationPatterns)) {
    errors.push(`Missing citations: ${requiredCitationPatterns.join(", ")}`);
  }

  const hasNumbers = /\d[\d,]*\s*(l|cr|₹|inr)/i.test(response.answer);
  if (
    hasNumbers &&
    response.tool_traces.length === 0 &&
    response.intent !== "portfolio" &&
    response.intent !== "firewall" &&
    response.intent !== "fy_analysis" &&
    response.intent !== "desk_day_plan"
  ) {
    errors.push("Numeric claim without tool trace");
  }

  return { valid: errors.length === 0, errors };
}
