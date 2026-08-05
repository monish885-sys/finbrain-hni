import { ARCHITECT_RULES } from "@capstone/types";
import type { RagCitation, ReasoningMode, ToolTrace } from "@capstone/types";

interface LlmSynthInput {
  query: string;
  citations: RagCitation[];
  toolTraces: ToolTrace[];
  templateAnswer: string;
  mode: ReasoningMode;
}

/**
 * Optional LLM synthesis layer — activated when CA_BUDDY_LLM_PROVIDER is set.
 * LLM narrates from citations + tool traces only; never computes tax math.
 */
export async function synthesizeWithLlm(input: LlmSynthInput): Promise<string | null> {
  const provider = process.env.CA_BUDDY_LLM_PROVIDER;
  if (!provider) return null;

  const apiKey = process.env.CA_BUDDY_LLM_API_KEY;
  if (!apiKey) return null;

  const model = process.env.CA_BUDDY_LLM_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.CA_BUDDY_LLM_BASE_URL ?? "https://api.openai.com/v1";

  const systemPrompt = [
    "You are ARCHITECT, powered by Fin — CAPSTONE's main HNI wealth buddy for India.",
    "Rules:",
    ...ARCHITECT_RULES.map((r) => `- ${r}`),
    "- Use ONLY numbers from tool_traces JSON. Never invent tax amounts.",
    "- Cite sections from citations JSON. Never invent IT Act sections.",
    "- End complex answers with consult-your-CA guidance.",
    "- Action Cards are instructions only — never imply execution.",
  ].join("\n");

  const userPayload = JSON.stringify({
    query: input.query,
    mode: input.mode,
    citations: input.citations,
    tool_traces: input.toolTraces,
    draft_answer: input.templateAnswer,
  });

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Synthesize a plain-language answer from this grounded payload:\n${userPayload}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
