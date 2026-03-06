import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteBackend } from '../../src/memory/sqlite-backend.js';
import { createMemoryEntry } from '../../src/memory/types.js';

describe('SQLiteBackend', () => {
  let backend: SQLiteBackend;

  beforeEach(async () => {
    backend = new SQLiteBackend();
    await backend.initialize();
  });

  afterEach(async () => {
    await backend.close();
  });

  it('should store and retrieve an entry', async () => {
    const entry = createMemoryEntry({ key: 'test-key', content: 'hello world' });
    await backend.store(entry);

    const result = await backend.retrieve('test-key');
    expect(result).toBeDefined();
    expect(result!.key).toBe('test-key');
    expect(result!.content).toBe('hello world');
  });

  it('should isolate entries by namespace', async () => {
    const entry1 = createMemoryEntry({ key: 'shared-key', content: 'ns1 content', namespace: 'ns1' });
    const entry2 = createMemoryEntry({ key: 'shared-key', content: 'ns2 content', namespace: 'ns2' });

    await backend.store(entry1);
    await backend.store(entry2);

    const result1 = await backend.retrieve('shared-key', 'ns1');
    const result2 = await backend.retrieve('shared-key', 'ns2');

    expect(result1!.content).toBe('ns1 content');
    expect(result2!.content).toBe('ns2 content');
  });

  it('should support prefix queries', async () => {
    const entries = [
      createMemoryEntry({ key: 'user:alice', content: 'Alice' }),
      createMemoryEntry({ key: 'user:bob', content: 'Bob' }),
      createMemoryEntry({ key: 'item:sword', content: 'Sword' }),
    ];

    for (const e of entries) await backend.store(e);

    const results = await backend.query({ type: 'prefix', keyPrefix: 'user:', namespace: 'default' });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.entry.key)).toContain('user:alice');
    expect(results.map(r => r.entry.key)).toContain('user:bob');
  });

  it('should support tag queries', async () => {
    const entry1 = createMemoryEntry({ key: 'a', content: 'A', tags: ['important', 'urgent'] });
    const entry2 = createMemoryEntry({ key: 'b', content: 'B', tags: ['important'] });
    const entry3 = createMemoryEntry({ key: 'c', content: 'C', tags: ['normal'] });

    await backend.store(entry1);
    await backend.store(entry2);
    await backend.store(entry3);

    const results = await backend.query({ type: 'tag', tags: ['important'], namespace: 'default' });
    expect(results).toHaveLength(2);
  });

  it('should update entry and increment version', async () => {
    const entry = createMemoryEntry({ key: 'versioned', content: 'v1' });
    await backend.store(entry);

    await backend.update(entry.id, { content: 'v2' });

    const result = await backend.retrieve('versioned');
    expect(result!.content).toBe('v2');
    expect(result!.version).toBe(2);
  });

  it('should delete an entry', async () => {
    const entry = createMemoryEntry({ key: 'to-delete', content: 'bye' });
    await backend.store(entry);

    await backend.delete(entry.id);

    const result = await backend.retrieve('to-delete');
    expect(result).toBeUndefined();
  });

  it('should increment access count on retrieve', async () => {
    const entry = createMemoryEntry({ key: 'counted', content: 'data' });
    await backend.store(entry);

    await backend.retrieve('counted');
    await backend.retrieve('counted');
    const result = await backend.retrieve('counted');

    expect(result!.accessCount).toBe(2); // 3 retrieves, but we read after 2nd increment happened; 3rd read gets value after 2nd increment
  });

  it('should respect limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      const entry = createMemoryEntry({ key: `item:${i}`, content: `content ${i}` });
      await backend.store(entry);
    }

    const results = await backend.query({ type: 'prefix', keyPrefix: 'item:', namespace: 'default', limit: 2, offset: 1 });
    expect(results).toHaveLength(2);
  });
});
