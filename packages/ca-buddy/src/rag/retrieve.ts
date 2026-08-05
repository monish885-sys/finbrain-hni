import type { RagCitation } from "@capstone/types";
import { getCorpusStore } from "../corpus/store";

export function retrieveCitations(
  query: string,
  options?: { topK?: number; minScore?: number; topics?: string[] },
): RagCitation[] {
  const store = getCorpusStore();
  const results = store.search(query, options);

  return results.map((r) => ({
    chunk_id: r.id,
    source: r.source,
    section: r.section,
    text: r.text,
    score: Math.round(r.score * 1000) / 1000,
  }));
}

export function hasCitationMatch(citations: RagCitation[], patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  const haystack = citations
    .map((c) => `${c.section} ${c.text} ${c.source}`.toLowerCase())
    .join(" ");
  return patterns.every((p) => haystack.includes(p.toLowerCase()));
}

export function getCorpusChunk(id: string) {
  return getCorpusStore().getById(id);
}

export function retrieveStrategyBullets(query: string, topics?: string[]): string[] {
  const store = getCorpusStore();
  return store
    .search(query, { topK: 4, topics, minScore: 0.05 })
    .filter((c) => c.document_path.includes("strategies"))
    .map((c) => `• ${c.text}`);
}
