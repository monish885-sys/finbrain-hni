#!/usr/bin/env tsx
/**
 * Validate and index corpus JSON files from corpus/regulatory and corpus/strategies.
 * Add new CA school papers / strategy cards as JSON — no code changes required.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCorpusStore, resetCorpusStore } from "../src/corpus/store";
import { listCorpusFiles } from "../src/config/loader";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const files = listCorpusFiles(ROOT);
if (files.length === 0) {
  console.error("No corpus files found under corpus/regulatory or corpus/strategies");
  process.exit(1);
}

resetCorpusStore();
const store = getCorpusStore(ROOT);

console.log(`Indexed ${store.size} chunks from ${files.length} documents:\n`);
for (const f of files) {
  console.log(`  ${f.replace(ROOT, "")}`);
}

const sample = store.search("gift to HUF clubbing Section 64", { topK: 2 });
console.log(`\nSample retrieval (${sample.length} hits):`);
for (const hit of sample) {
  console.log(`  [${hit.score.toFixed(3)}] ${hit.id} — ${hit.section}`);
}

console.log("\nCorpus ingest complete.");
