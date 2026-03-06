import { PatternStore } from './pattern-store.js';
import { DEFAULT_PATTERN_CONFIG, PatternStoreConfig } from './types.js';

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > 0)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export class PatternLifecycle {
  private store: PatternStore;
  private config: PatternStoreConfig;

  constructor(store: PatternStore, config?: Partial<PatternStoreConfig>) {
    this.config = { ...DEFAULT_PATTERN_CONFIG, ...config };
    this.store = store;
  }

  promote(): number {
    let count = 0;
    const shortTerm = this.store.getShortTermPatterns();
    const toPromote: string[] = [];

    for (const [id, pattern] of shortTerm) {
      if (
        pattern.usageCount >= this.config.promotionThresholdUsage &&
        pattern.quality >= this.config.promotionThresholdQuality
      ) {
        toPromote.push(id);
      }
    }

    for (const id of toPromote) {
      this.store.moveToLongTerm(id);
      count++;
    }

    return count;
  }

  prune(): number {
    let count = 0;
    const shortTerm = this.store.getShortTermPatterns();
    const now = Date.now();
    const toPrune: string[] = [];

    for (const [id, pattern] of shortTerm) {
      const age = now - pattern.createdAt;
      if (
        age > this.config.pruneMaxAgeMs &&
        pattern.usageCount < this.config.pruneMinUsage &&
        pattern.quality < 0.4
      ) {
        toPrune.push(id);
      }
    }

    for (const id of toPrune) {
      this.store.removeFromShortTerm(id);
      count++;
    }

    return count;
  }

  consolidate(): { promoted: number; pruned: number; deduplicated: number } {
    const promoted = this.promote();
    const pruned = this.prune();

    // Dedup: remove short-term patterns that are >0.95 similar to long-term ones
    let deduplicated = 0;
    const shortTerm = this.store.getShortTermPatterns();
    const longTerm = this.store.getLongTermPatterns();
    const toRemove: string[] = [];

    for (const [shortId, shortPattern] of shortTerm) {
      for (const [, longPattern] of longTerm) {
        const sim = jaccardSimilarity(shortPattern.content, longPattern.content);
        if (sim > this.config.deduplicationThreshold) {
          toRemove.push(shortId);
          break;
        }
      }
    }

    for (const id of toRemove) {
      this.store.removeFromShortTerm(id);
      deduplicated++;
    }

    return { promoted, pruned, deduplicated };
  }
}
