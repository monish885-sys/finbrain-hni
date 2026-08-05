import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GoldenScenario } from "@capstone/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, "../../evals/golden");

export function loadGoldenScenariosFromDisk(): GoldenScenario[] {
  const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith(".json"));
  return files.flatMap((file) => {
    const raw = JSON.parse(readFileSync(join(GOLDEN_DIR, file), "utf-8"));
    return Array.isArray(raw) ? raw : [raw];
  }) as GoldenScenario[];
}
