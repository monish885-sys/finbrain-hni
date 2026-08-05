#!/usr/bin/env tsx
/**
 * Persist Fin RAG corpus chunks into API DB (CorpusChunkRecord).
 * Runtime retrieval still uses in-memory CorpusStore; DB is the ship/staging mirror.
 */
import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getCorpusStore, resetCorpusStore } from "@capstone/ca-buddy";

const dbUrl = `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  resetCorpusStore();
  const store = getCorpusStore();
  const chunks = store.getAll();
  console.log(`Persisting ${chunks.length} corpus chunks…`);

  for (const c of chunks) {
    await prisma.corpusChunkRecord.upsert({
      where: { id: c.id },
      update: {
        source: c.source,
        section: c.section,
        text: c.text,
        topicsJson: JSON.stringify(c.topics ?? []),
        documentPath: c.document_path,
        vectorJson: JSON.stringify(c.vector),
        license: c.license ?? null,
      },
      create: {
        id: c.id,
        source: c.source,
        section: c.section,
        text: c.text,
        topicsJson: JSON.stringify(c.topics ?? []),
        documentPath: c.document_path,
        vectorJson: JSON.stringify(c.vector),
        license: c.license ?? null,
      },
    });
  }

  const count = await prisma.corpusChunkRecord.count();
  console.log(`Corpus persist complete: ${count} rows in CorpusChunkRecord`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
