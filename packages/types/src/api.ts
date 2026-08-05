import type { CaBuddyResponse } from "./ca-buddy";

/** POST /ai/ask body */
export interface AskAiRequest {
  query: string;
  /** Default true — no external LLM unless explicitly set false */
  deterministic?: boolean;
  /** Default "demo" (Kapoor fixtures). "live" = DB brainset. "none" skips portfolio. */
  portfolio?: "demo" | "none" | "live";
  /** Required when portfolio=live */
  familyId?: string;
}

/** POST /ai/ask success body */
export interface AskAiResponse {
  request_id: string;
  source: "fin";
  response: CaBuddyResponse;
}

/** GET /health */
export interface HealthResponse {
  status: "ok";
  service: "capstone-api";
  version: string;
  timestamp: string;
}
