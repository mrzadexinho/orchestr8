export interface Pattern {
  id: string;
  content: string;
  strategy: string;
  domain: string;
  tags: string[];
  quality: number;
  usageCount: number;
  successCount: number;
  hash: string;
  createdAt: number;
  updatedAt: number;
  promotedAt?: number;
}

export interface PatternInput {
  content: string;
  strategy: string;
  domain: string;
  tags?: string[];
  success?: boolean;
}

export interface PatternSearchResult {
  pattern: Pattern;
  similarity: number;
}

export type PatternTier = 'short-term' | 'long-term';

export interface PatternStoreConfig {
  shortTermCapacity: number;
  longTermCapacity: number;
  promotionThresholdUsage: number;
  promotionThresholdQuality: number;
  pruneMaxAgeMs: number;
  pruneMinUsage: number;
  deduplicationThreshold: number;
}

export const DEFAULT_PATTERN_CONFIG: PatternStoreConfig = {
  shortTermCapacity: 1000,
  longTermCapacity: 5000,
  promotionThresholdUsage: 3,
  promotionThresholdQuality: 0.6,
  pruneMaxAgeMs: 24 * 60 * 60 * 1000,
  pruneMinUsage: 2,
  deduplicationThreshold: 0.95,
};
