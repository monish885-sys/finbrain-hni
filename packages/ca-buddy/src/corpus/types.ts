export interface CorpusChunkRecord {
  id: string;
  section: string;
  text: string;
  keywords: string[];
  topics?: string[];
  mode?: "A" | "B";
  requires_ca_review?: boolean;
  source_url?: string;
  citation_note?: string;
}

export interface CorpusSourceFile {
  source_meta: {
    name: string;
    license: string;
    jurisdiction?: string;
    type?: string;
    author?: string;
    source_url?: string;
    last_verified_on?: string;
  };
  chunks: CorpusChunkRecord[];
}

export interface IndexedCorpusChunk extends CorpusChunkRecord {
  source: string;
  license: string;
  document_path: string;
  vector: number[];
}
