#!/usr/bin/env tsx
import { runDeterministicEval } from "./runner";

const PASS_THRESHOLD = 0.9;

const { results, passRate } = runDeterministicEval();

console.log("\n=== CA Buddy Deterministic Eval ===\n");

for (const r of results) {
  const icon = r.passed ? "✓" : "✗";
  console.log(`${icon} ${r.id}`);
  if (!r.passed) {
    for (const e of r.errors) console.log(`    - ${e}`);
  }
}

const passed = results.filter((r) => r.passed).length;
console.log(`\n${passed}/${results.length} passed (${(passRate * 100).toFixed(1)}%)`);
console.log(`Threshold: ${(PASS_THRESHOLD * 100).toFixed(0)}%\n`);

if (passRate < PASS_THRESHOLD) {
  console.error("FAIL: Deterministic eval below threshold");
  process.exit(1);
}

console.log("PASS: Deterministic eval meets threshold");
