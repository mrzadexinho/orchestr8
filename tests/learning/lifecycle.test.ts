import { describe, it, expect } from 'vitest';
import { PatternStore } from '../../src/learning/pattern-store.js';
import { PatternLifecycle } from '../../src/learning/lifecycle.js';

describe('PatternLifecycle', () => {
  it('promotes patterns when threshold met', () => {
    const store = new PatternStore();
    const lifecycle = new PatternLifecycle(store);

    const pattern = store.store({ content: 'promotable pattern', strategy: 's', domain: 'd', success: true });
    // usageCount=1, quality=0.6. Need usageCount >= 3
    store.recordOutcome(pattern.id, true);  // usageCount=2, successCount=1, quality=0.3+(1/2)*0.7=0.65
    store.recordOutcome(pattern.id, true);  // usageCount=3, successCount=2, quality=0.3+(2/3)*0.7≈0.767

    const promoted = lifecycle.promote();
    expect(promoted).toBe(1);
    expect(store.getLongTermPatterns().has(pattern.id)).toBe(true);
    expect(store.getShortTermPatterns().has(pattern.id)).toBe(false);
  });

  it('does not promote below threshold', () => {
    const store = new PatternStore();
    const lifecycle = new PatternLifecycle(store);

    // Only 1 usage, quality 0.3 - below both thresholds
    store.store({ content: 'low usage pattern', strategy: 's', domain: 'd' });

    const promoted = lifecycle.promote();
    expect(promoted).toBe(0);
  });

  it('prunes old low-quality patterns', () => {
    const store = new PatternStore();
    const lifecycle = new PatternLifecycle(store);

    const pattern = store.store({ content: 'old low quality', strategy: 's', domain: 'd' });
    // Make it old by modifying createdAt
    const p = store.getPattern(pattern.id)!;
    p.createdAt = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    // usageCount=1 (< 2), quality=0.3 (< 0.4)

    const pruned = lifecycle.prune();
    expect(pruned).toBe(1);
    expect(store.getPattern(pattern.id)).toBeUndefined();
  });

  it('long-term patterns survive prune', () => {
    const store = new PatternStore();
    const lifecycle = new PatternLifecycle(store);

    // Create and promote a pattern
    const pattern = store.store({ content: 'long term survivor', strategy: 's', domain: 'd', success: true });
    store.recordOutcome(pattern.id, true);
    store.recordOutcome(pattern.id, true);
    lifecycle.promote();

    // Manually make it old
    const p = store.getPattern(pattern.id)!;
    p.createdAt = Date.now() - 48 * 60 * 60 * 1000;

    const pruned = lifecycle.prune();
    expect(pruned).toBe(0);
    expect(store.getPattern(pattern.id)).toBeDefined();
  });

  it('consolidate runs promote, prune, and dedup', () => {
    const store = new PatternStore();
    const lifecycle = new PatternLifecycle(store);

    // Create a promotable pattern with many unique words so near-duplicate exceeds 0.95 Jaccard
    // We need intersection/union > 0.95, so with 40 shared words and 1 different: 40/41 ≈ 0.976
    const words = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu one two three four five six seven eight nine ten eleven twelve thirteen fourteen';
    const p1 = store.store({ content: words, strategy: 's', domain: 'd', success: true });
    store.recordOutcome(p1.id, true);
    store.recordOutcome(p1.id, true);

    // Create an old low-quality pattern (completely different words)
    const p2 = store.store({ content: 'zzz_unique_prune_target_xyzzy_foobar', strategy: 's', domain: 'd' });
    store.getPattern(p2.id)!.createdAt = Date.now() - 25 * 60 * 60 * 1000;

    // Create a near-duplicate (replace last word "fourteen" with "fifteen")
    const nearDuplicate = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu one two three four five six seven eight nine ten eleven twelve thirteen fifteen';
    const p3 = store.store({ content: nearDuplicate, strategy: 's', domain: 'd' });

    const result = lifecycle.consolidate();
    expect(result.promoted).toBe(1);
    expect(result.pruned).toBe(1);
    // p3 is very similar to p1 (now in long-term), so it should be deduplicated
    expect(result.deduplicated).toBe(1);
  });
});
