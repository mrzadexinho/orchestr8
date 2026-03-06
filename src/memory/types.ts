export interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  embedding?: number[];
  type: MemoryType;
  namespace: string;
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  accessCount: number;
  createdAt: number;
  updatedAt: number;
}

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working' | 'cache';

export interface MemoryEntryInput {
  key: string;
  content: string;
  embedding?: number[];
  type?: MemoryType;
  namespace?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  type: QueryType;
  namespace?: string;
  key?: string;
  keyPrefix?: string;
  tags?: string[];
  content?: string;
  embedding?: number[];
  limit?: number;
  offset?: number;
  threshold?: number;
}

export type QueryType = 'exact' | 'prefix' | 'tag' | 'semantic' | 'hybrid';

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
  source: 'structured' | 'vector' | 'hybrid';
}

export interface IMemoryBackend {
  initialize(): Promise<void>;
  store(entry: MemoryEntry): Promise<void>;
  retrieve(key: string, namespace?: string): Promise<MemoryEntry | undefined>;
  query(query: MemoryQuery): Promise<SearchResult[]>;
  update(id: string, updates: Partial<MemoryEntryInput>): Promise<void>;
  delete(id: string): Promise<void>;
  close(): Promise<void>;
}

export function createMemoryEntry(input: MemoryEntryInput): MemoryEntry {
  const now = Date.now();
  return {
    id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    key: input.key,
    content: input.content,
    embedding: input.embedding,
    type: input.type ?? 'working',
    namespace: input.namespace ?? 'default',
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    version: 1,
    accessCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
