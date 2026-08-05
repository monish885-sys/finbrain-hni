import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getBuddyConfig, listCorpusFiles } from "../config/loader";
import { buildIdf, chunkTokens, cosineSimilarity, toTfIdfVector, tokenize } from "./embeddings";
import type { CorpusSourceFile, IndexedCorpusChunk } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class CorpusStore {
  private chunks: IndexedCorpusChunk[] = [];
  private idf = new Map<string, number>();
  private vocab: string[] = [];

  constructor(private readonly rootDir: string) {}

  static create(rootDir?: string): CorpusStore {
    const base = rootDir ?? join(__dirname, "../..");
    const store = new CorpusStore(base);
    store.load();
    return store;
  }

  load(): void {
    const files = listCorpusFiles(this.rootDir);
    const rawChunks: IndexedCorpusChunk[] = [];

    for (const filePath of files) {
      const doc = JSON.parse(readFileSync(filePath, "utf-8")) as CorpusSourceFile;
      for (const chunk of doc.chunks) {
        rawChunks.push({
          ...chunk,
          source: doc.source_meta.name,
          license: doc.source_meta.license,
          document_path: filePath.replace(this.rootDir, ""),
          vector: [],
        });
      }
    }

    const tokenLists = rawChunks.map((c) => chunkTokens(c));
    const { idf, vocab } = buildIdf(tokenLists);
    this.idf = idf;
    this.vocab = vocab;
    this.chunks = rawChunks.map((chunk, i) => ({
      ...chunk,
      vector: toTfIdfVector(tokenLists[i], idf, vocab),
    }));
  }

  get size(): number {
    return this.chunks.length;
  }

  getAll(): IndexedCorpusChunk[] {
    return this.chunks;
  }

  getById(id: string): IndexedCorpusChunk | undefined {
    return this.chunks.find((c) => c.id === id);
  }

  search(
    query: string,
    options?: { topK?: number; minScore?: number; topics?: string[] },
  ): Array<IndexedCorpusChunk & { score: number }> {
    const config = getBuddyConfig(this.rootDir);
    const topK = options?.topK ?? config.runtime.retrieval.top_k;
    const minScore = options?.minScore ?? config.runtime.retrieval.min_score;
    const queryVector = toTfIdfVector(tokenize(query), this.idf, this.vocab);

    const scored = this.chunks
      .filter((c) => !options?.topics?.length || c.topics?.some((t) => options.topics!.includes(t)))
      .map((chunk) => {
        const base = cosineSimilarity(queryVector, chunk.vector);
        // Prefer statute/official chunks slightly so strategy cards don't crowd out citations.
        const regulatoryBoost = chunk.document_path.includes("/regulatory/") ? 1.15 : 1;
        return { ...chunk, score: base * regulatoryBoost };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }
}

let defaultStore: CorpusStore | null = null;

export function getCorpusStore(rootDir?: string): CorpusStore {
  if (!rootDir && defaultStore) return defaultStore;
  const store = CorpusStore.create(rootDir);
  if (!rootDir) defaultStore = store;
  return store;
}

export function resetCorpusStore(): void {
  defaultStore = null;
}
