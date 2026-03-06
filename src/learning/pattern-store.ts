import {
  Pattern,
  PatternInput,
  PatternSearchResult,
  PatternStoreConfig,
  DEFAULT_PATTERN_CONFIG,
} from './types.js';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

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

export class PatternStore {
  private shortTerm: Map<string, Pattern> = new Map();
  private longTerm: Map<string, Pattern> = new Map();
  private config: PatternStoreConfig;

  constructor(config?: Partial<PatternStoreConfig>) {
    this.config = { ...DEFAULT_PATTERN_CONFIG, ...config };
  }

  store(input: PatternInput): Pattern {
    const hash = simpleHash(input.content);

    // Check dedup in both stores
    for (const [, pattern] of this.shortTerm) {
      if (pattern.hash === hash) {
        pattern.usageCount++;
        pattern.updatedAt = Date.now();
        return pattern;
      }
    }
    for (const [, pattern] of this.longTerm) {
      if (pattern.hash === hash) {
        pattern.usageCount++;
        pattern.updatedAt = Date.now();
        return pattern;
      }
    }

    // Evict oldest if at capacity
    if (this.shortTerm.size >= this.config.shortTermCapacity) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [id, p] of this.shortTerm) {
        if (p.createdAt < oldestTime) {
          oldestTime = p.createdAt;
          oldestId = id;
        }
      }
      if (oldestId) this.shortTerm.delete(oldestId);
    }

    const now = Date.now();
    const id = `pat_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const pattern: Pattern = {
      id,
      content: input.content,
      strategy: input.strategy,
      domain: input.domain,
      tags: input.tags ?? [],
      quality: input.success !== undefined ? (input.success ? 0.6 : 0.3) : 0.3,
      usageCount: 1,
      successCount: input.success ? 1 : 0,
      hash,
      createdAt: now,
      updatedAt: now,
    };

    this.shortTerm.set(id, pattern);
    return pattern;
  }

  search(content: string, limit: number = 5): PatternSearchResult[] {
    const results: PatternSearchResult[] = [];

    const allPatterns = [...this.shortTerm.values(), ...this.longTerm.values()];
    for (const pattern of allPatterns) {
      const similarity = jaccardSimilarity(content, pattern.content);
      if (similarity > 0) {
        results.push({ pattern, similarity });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  recordOutcome(patternId: string, success: boolean): void {
    const pattern = this.getPattern(patternId);
    if (!pattern) return;

    pattern.usageCount++;
    if (success) pattern.successCount++;
    pattern.quality = 0.3 + (pattern.successCount / pattern.usageCount) * 0.7;
    pattern.updatedAt = Date.now();
  }

  getPattern(id: string): Pattern | undefined {
    return this.shortTerm.get(id) ?? this.longTerm.get(id);
  }

  // Internal accessors for lifecycle management
  getShortTermPatterns(): Map<string, Pattern> {
    return this.shortTerm;
  }

  getLongTermPatterns(): Map<string, Pattern> {
    return this.longTerm;
  }

  moveToLongTerm(id: string): void {
    const pattern = this.shortTerm.get(id);
    if (pattern) {
      this.shortTerm.delete(id);
      pattern.promotedAt = Date.now();
      this.longTerm.set(id, pattern);
    }
  }

  removeFromShortTerm(id: string): void {
    this.shortTerm.delete(id);
  }
}
