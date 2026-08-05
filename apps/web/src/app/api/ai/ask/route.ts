import { randomUUID } from "node:crypto";
import type { AskAiRequest, AskAiResponse } from "@capstone/types";

export const runtime = "nodejs";

/**
 * BFF for ARCHITECT → Fin.
 * Prefer Nest `CAPSTONE_API_URL` when set; otherwise run Fin inline (demo DX).
 */
export async function POST(req: Request): Promise<Response> {
  let body: AskAiRequest;
  try {
    body = (await req.json()) as AskAiRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const payload: AskAiRequest = {
    query,
    deterministic: body.deterministic ?? true,
    portfolio: body.portfolio ?? "demo",
  };

  const apiUrl = process.env.CAPSTONE_API_URL?.replace(/\/$/, "");
  if (apiUrl) {
    try {
      const upstream = await fetch(`${apiUrl}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      if (upstream.ok) {
        const data = (await upstream.json()) as AskAiResponse;
        return Response.json(data);
      }
    } catch {
      // Fall through to inline Fin when Nest is unreachable
    }
  }

  const { ask, askDemo } = await import("@capstone/ca-buddy");
  const response =
    payload.portfolio === "none"
      ? await ask(payload.query, { deterministic: payload.deterministic })
      : await askDemo(payload.query, { deterministic: payload.deterministic });

  const data: AskAiResponse = {
    request_id: randomUUID(),
    source: "fin",
    response,
  };
  return Response.json(data);
}
