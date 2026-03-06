import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorBackend } from '../../src/memory/vector-backend.js';
import { createMemoryEntry } from '../../src/memory/types.js';

describe('VectorBackend', () => {
  let backend: VectorBackend;

  beforeEach(async () => {
    backend = new VectorBackend();
    await backend.initialize();
  });

  afterEach(async () => {
    await backend.close();
  });

  it('should store with embedding and search returns similar', async () => {
    const entry1 = createMemoryEntry({
      key: 'cat',
      content: 'A cat sat on the mat',
      embedding: [1, 0, 0, 0],
    });
    const entry2 = createMemoryEntry({
      key: 'dog',
      content: 'A dog ran in the park',
      embedding: [0.9, 0.1, 0, 0],
    });
    const entry3 = createMemoryEntry({
      key: 'car',
      content: 'A car drove on the road',
      embedding: [0, 0, 1, 0],
    });

    await backend.store(entry1);
    await backend.store(entry2);
    await backend.store(entry3);

    const results = await backend.query({
      type: 'semantic',
      embedding: [1, 0, 0, 0],
      namespace: 'default',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.key).toBe('cat');
    expect(results[1].entry.key).toBe('dog');
  });

  it('should filter by threshold', async () => {
    const entry1 = createMemoryEntry({
      key: 'similar',
      content: 'Similar',
      embedding: [1, 0, 0],
    });
    const entry2 = createMemoryEntry({
      key: 'different',
      content: 'Different',
      embedding: [0, 0, 1],
    });

    await backend.store(entry1);
    await backend.store(entry2);

    const results = await backend.query({
      type: 'semantic',
      embedding: [1, 0, 0],
      threshold: 0.9,
      namespace: 'default',
    });

    expect(results).toHaveLength(1);
    expect(results[0].entry.key).toBe('similar');
  });

  it('should respect top-k (limit) ranking', async () => {
    for (let i = 0; i < 10; i++) {
      const embedding = new Array(4).fill(0);
      embedding[0] = 1 - i * 0.1;
      embedding[1] = i * 0.1;
      await backend.store(
        createMemoryEntry({ key: `item-${i}`, content: `Item ${i}`, embedding })
      );
    }

    const results = await backend.query({
      type: 'semantic',
      embedding: [1, 0, 0, 0],
      limit: 3,
      namespace: 'default',
    });

    expect(results).toHaveLength(3);
    // First result should have the highest similarity
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });

  it('should return empty results when no embeddings match', async () => {
    const entry = createMemoryEntry({ key: 'no-embed', content: 'No embedding' });
    await backend.store(entry);

    const results = await backend.query({
      type: 'semantic',
      embedding: [1, 0, 0],
      namespace: 'default',
    });

    expect(results).toHaveLength(0);
  });
});
