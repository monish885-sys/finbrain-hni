import { EnvTspClient } from "./env.tsp";
import { SimulatedTspClient } from "./simulated.tsp";
import type { TspClient } from "./types";

export function createTspClient(): TspClient {
  const provider = (process.env.TSP_PROVIDER ?? "simulated").toLowerCase();
  const hasKeys = Boolean(process.env.TSP_API_KEY && process.env.TSP_BASE_URL);
  if (provider !== "simulated" && hasKeys) {
    return new EnvTspClient();
  }
  return new SimulatedTspClient();
}

export * from "./types";
export { SimulatedTspClient } from "./simulated.tsp";
export { EnvTspClient } from "./env.tsp";
