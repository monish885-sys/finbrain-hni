const STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "are", "what", "when", "your", "can",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** TF vector for a document token list given global IDF map */
export function toTfIdfVector(tokens: string[], idf: Map<string, number>, vocab: string[]): number[] {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const maxTf = Math.max(...tf.values(), 1);
  return vocab.map((term) => {
    const raw = (tf.get(term) ?? 0) / maxTf;
    return raw * (idf.get(term) ?? 0);
  });
}

export function buildIdf(allTokenLists: string[][]): { idf: Map<string, number>; vocab: string[] } {
  const df = new Map<string, number>();
  const n = allTokenLists.length;
  for (const tokens of allTokenLists) {
    const unique = new Set(tokens);
    for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
  }
  const vocab = [...idf.keys()].sort();
  return { idf, vocab };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function chunkTokens(chunk: { text: string; keywords: string[]; section: string; topics?: string[] }): string[] {
  return tokenize([chunk.text, chunk.section, ...(chunk.keywords ?? []), ...(chunk.topics ?? [])].join(" "));
}
