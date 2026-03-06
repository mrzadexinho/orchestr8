import { describe, it, expect } from 'vitest';
import { PatternStore } from '../../src/learning/pattern-store.js';

describe('PatternStore', () => {
  it('stores a pattern and retrieves it', () => {
    const store = new PatternStore();
    const pattern = store.store({
      content: 'Use dependency injection for services',
      strategy: 'refactoring',
      domain: 'architecture',
    });

    expect(pattern.id).toBeDefined();
    expect(pattern.content).toBe('Use dependency injection for services');
    expect(pattern.usageCount).toBe(1);

    const retrieved = store.getPattern(pattern.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(pattern.id);
  });

  it('searches by content similarity', () => {
    const store = new PatternStore();
    store.store({ content: 'dependency injection pattern for services', strategy: 's', domain: 'd' });
    store.store({ content: 'caching strategy for database queries', strategy: 's', domain: 'd' });
    store.store({ content: 'use injection for dependency management', strategy: 's', domain: 'd' });

    const results = store.search('dependency injection');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0);
    // The most similar should mention dependency injection
    expect(results[0].pattern.content).toContain('dependency');
  });

  it('detects duplicates by hash', () => {
    const store = new PatternStore();
    const first = store.store({ content: 'exact same content', strategy: 's', domain: 'd' });
    const second = store.store({ content: 'exact same content', strategy: 's', domain: 'd' });

    expect(first.id).toBe(second.id);
    expect(second.usageCount).toBe(2);
  });

  it('records outcome and updates quality', () => {
    const store = new PatternStore();
    const pattern = store.store({ content: 'test pattern', strategy: 's', domain: 'd' });

    store.recordOutcome(pattern.id, true);
    const updated = store.getPattern(pattern.id)!;
    expect(updated.usageCount).toBe(2);
    expect(updated.successCount).toBe(1);
  });

  it('quality formula is correct: 0.3 + (successCount/usageCount) * 0.7', () => {
    const store = new PatternStore();
    const pattern = store.store({ content: 'quality test', strategy: 's', domain: 'd' });

    // Initial: usageCount=1, successCount=0, quality=0.3
    store.recordOutcome(pattern.id, true);  // usageCount=2, successCount=1
    store.recordOutcome(pattern.id, true);  // usageCount=3, successCount=2
    store.recordOutcome(pattern.id, false); // usageCount=4, successCount=2

    const updated = store.getPattern(pattern.id)!;
    const expectedQuality = 0.3 + (2 / 4) * 0.7;
    expect(updated.quality).toBeCloseTo(expectedQuality);
  });

  it('respects short-term capacity by evicting oldest', () => {
    const store = new PatternStore({ shortTermCapacity: 3 });

    const p1 = store.store({ content: 'first pattern', strategy: 's', domain: 'd' });
    const p2 = store.store({ content: 'second pattern', strategy: 's', domain: 'd' });
    const p3 = store.store({ content: 'third pattern', strategy: 's', domain: 'd' });
    const p4 = store.store({ content: 'fourth pattern', strategy: 's', domain: 'd' });

    // First should be evicted
    expect(store.getPattern(p1.id)).toBeUndefined();
    // Others should exist
    expect(store.getPattern(p2.id)).toBeDefined();
    expect(store.getPattern(p3.id)).toBeDefined();
    expect(store.getPattern(p4.id)).toBeDefined();
  });
});
