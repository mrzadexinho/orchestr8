import type { IMemoryBackend, MemoryEntry, MemoryEntryInput, MemoryQuery, SearchResult } from './types.js';
import type { SQLiteBackend } from './sqlite-backend.js';
import type { VectorBackend } from './vector-backend.js';

export class HybridBackend implements IMemoryBackend {
  constructor(
    private sqlite: SQLiteBackend,
    private vector: VectorBackend
  ) {}

  async initialize(): Promise<void> {
    await Promise.all([this.sqlite.initialize(), this.vector.initialize()]);
  }

  async store(entry: MemoryEntry): Promise<void> {
    await Promise.all([this.sqlite.store(entry), this.vector.store(entry)]);
  }

  async retrieve(key: string, namespace?: string): Promise<MemoryEntry | undefined> {
    return this.sqlite.retrieve(key, namespace);
  }

  async query(query: MemoryQuery): Promise<SearchResult[]> {
    switch (query.type) {
      case 'exact':
      case 'prefix':
      case 'tag':
        return this.sqlite.query(query);

      case 'semantic':
        return this.vector.query(query);

      case 'hybrid': {
        const [sqliteResults, vectorResults] = await Promise.all([
          this.sqlite.query({ ...query, type: 'exact' }),
          this.vector.query(query),
        ]);

        return this.mergeResults(sqliteResults, vectorResults);
      }

      default:
        return [];
    }
  }

  async update(id: string, updates: Partial<MemoryEntryInput>): Promise<void> {
    await Promise.all([this.sqlite.update(id, updates), this.vector.update(id, updates)]);
  }

  async delete(id: string): Promise<void> {
    await Promise.all([this.sqlite.delete(id), this.vector.delete(id)]);
  }

  async close(): Promise<void> {
    await Promise.all([this.sqlite.close(), this.vector.close()]);
  }

  private mergeResults(structured: SearchResult[], vector: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    for (const result of structured) {
      merged.set(result.entry.id, {
        entry: result.entry,
        score: result.score,
        source: 'hybrid',
      });
    }

    for (const result of vector) {
      const existing = merged.get(result.entry.id);
      if (existing) {
        existing.score = (existing.score + result.score) / 2;
      } else {
        merged.set(result.entry.id, {
          entry: result.entry,
          score: result.score,
          source: 'hybrid',
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }
}
