import type { IMemoryBackend, MemoryEntry, MemoryEntryInput, MemoryQuery, SearchResult } from './types.js';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export class VectorBackend implements IMemoryBackend {
  private entries: Map<string, MemoryEntry> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed for in-memory store
  }

  async store(entry: MemoryEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry });
  }

  async retrieve(key: string, namespace: string = 'default'): Promise<MemoryEntry | undefined> {
    for (const entry of this.entries.values()) {
      if (entry.key === key && entry.namespace === namespace) {
        entry.accessCount++;
        return { ...entry };
      }
    }
    return undefined;
  }

  async query(query: MemoryQuery): Promise<SearchResult[]> {
    if (query.type !== 'semantic' && query.type !== 'hybrid') {
      return [];
    }

    const queryEmbedding = query.embedding;
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return [];
    }

    const threshold = query.threshold ?? 0.0;
    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;

    const scored: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (query.namespace && entry.namespace !== query.namespace) continue;
      if (!entry.embedding || entry.embedding.length === 0) continue;

      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      if (score >= threshold) {
        scored.push({
          entry: { ...entry },
          score,
          source: 'vector',
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(offset, offset + limit);
  }

  async update(id: string, updates: Partial<MemoryEntryInput>): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;

    if (updates.key !== undefined) entry.key = updates.key;
    if (updates.content !== undefined) entry.content = updates.content;
    if (updates.embedding !== undefined) entry.embedding = updates.embedding;
    if (updates.type !== undefined) entry.type = updates.type;
    if (updates.namespace !== undefined) entry.namespace = updates.namespace;
    if (updates.tags !== undefined) entry.tags = updates.tags;
    if (updates.metadata !== undefined) entry.metadata = updates.metadata;

    entry.version++;
    entry.updatedAt = Date.now();
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async close(): Promise<void> {
    this.entries.clear();
  }
}
