import type { TspClient } from "./types";
import { EnvTspClient } from "./env.tsp";
import { SimulatedTspClient } from "./simulated.tsp";
import { SetuTspClient, setuConfigured } from "./setu.tsp";

/**
 * Prefer Setu when credentials are present (or TSP_PROVIDER=setu).
 * Generic EnvTspClient remains for custom HTTP TSPs.
 * Default: simulated (local demos without keys).
 */
export function createTspClient(): TspClient {
  const provider = (process.env.TSP_PROVIDER ?? "simulated").toLowerCase();

  if (provider === "setu" || setuConfigured()) {
    return new SetuTspClient();
  }

  if (provider !== "simulated") {
    const envClient = new EnvTspClient();
    if (envClient.configured) return envClient;
  }

  return new SimulatedTspClient();
}

export * from "./types";
export { SimulatedTspClient } from "./simulated.tsp";
export { EnvTspClient } from "./env.tsp";
export { SetuTspClient, setuConfigured, setuMissingEnv } from "./setu.tsp";
export { parseSetuFiPayload } from "./setu-fi-parser";
