import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteBackend } from '../../src/memory/sqlite-backend.js';
import { VectorBackend } from '../../src/memory/vector-backend.js';
import { HybridBackend } from '../../src/memory/hybrid-backend.js';
import { createMemoryEntry } from '../../src/memory/types.js';

describe('HybridBackend', () => {
  let sqlite: SQLiteBackend;
  let vector: VectorBackend;
  let hybrid: HybridBackend;

  beforeEach(async () => {
    sqlite = new SQLiteBackend();
    vector = new VectorBackend();
    hybrid = new HybridBackend(sqlite, vector);
    await hybrid.initialize();
  });

  afterEach(async () => {
    await hybrid.close();
  });

  it('should dual-write to both backends', async () => {
    const entry = createMemoryEntry({
      key: 'dual',
      content: 'Stored in both',
      embedding: [1, 0, 0],
    });

    await hybrid.store(entry);

    // Both backends should have the entry
    const fromSqlite = await sqlite.retrieve('dual');
    const fromVector = await vector.retrieve('dual');

    expect(fromSqlite).toBeDefined();
    expect(fromVector).toBeDefined();
    expect(fromSqlite!.content).toBe('Stored in both');
    expect(fromVector!.content).toBe('Stored in both');
  });

  it('should route exact queries to SQLite', async () => {
    const entry = createMemoryEntry({ key: 'exact-key', content: 'exact content' });
    await hybrid.store(entry);

    const results = await hybrid.query({
      type: 'exact',
      key: 'exact-key',
      namespace: 'default',
    });

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('structured');
    expect(results[0].entry.content).toBe('exact content');
  });

  it('should route semantic queries to vector backend', async () => {
    const entry = createMemoryEntry({
      key: 'semantic-key',
      content: 'semantic content',
      embedding: [1, 0, 0],
    });
    await hybrid.store(entry);

    const results = await hybrid.query({
      type: 'semantic',
      embedding: [1, 0, 0],
      namespace: 'default',
    });

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('vector');
  });

  it('should delete from both backends', async () => {
    const entry = createMemoryEntry({
      key: 'to-delete',
      content: 'will be removed',
      embedding: [0, 1, 0],
    });
    await hybrid.store(entry);

    await hybrid.delete(entry.id);

    const fromSqlite = await sqlite.retrieve('to-delete');
    const fromVector = await vector.retrieve('to-delete');

    expect(fromSqlite).toBeUndefined();
    expect(fromVector).toBeUndefined();
  });
});
