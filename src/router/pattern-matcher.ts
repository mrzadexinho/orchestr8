import { RoutingResult, RoutingAlternative } from './types.js';

interface PatternRule {
  pattern: RegExp;
  agent: string;
  confidence: number;
}

const PATTERN_RULES: PatternRule[] = [
  { pattern: /security|auth|cve|vuln|encrypt|password|token/i, agent: 'security-architect', confidence: 0.85 },
  { pattern: /test|spec|mock|coverage|tdd|assert|junit/i, agent: 'test-architect', confidence: 0.85 },
  { pattern: /perf|optim|fast|memory|cache|speed|slow|latency/i, agent: 'performance-engineer', confidence: 0.85 },
  { pattern: /architect|design|ddd|domain|refactor|struct|pattern/i, agent: 'core-architect', confidence: 0.85 },
  { pattern: /review|audit|check|inspect|lint/i, agent: 'reviewer', confidence: 0.80 },
  { pattern: /doc|readme|comment|explain|api\s*doc/i, agent: 'documenter', confidence: 0.80 },
];

export class PatternMatcher {
  match(taskDescription: string): RoutingResult {
    const matches: { agent: string; confidence: number; keyword: string }[] = [];

    for (const rule of PATTERN_RULES) {
      const match = taskDescription.match(rule.pattern);
      if (match) {
        matches.push({
          agent: rule.agent,
          confidence: rule.confidence,
          keyword: match[0],
        });
      }
    }

    if (matches.length === 0) {
      return {
        agent: 'coder',
        confidence: 0.70,
        alternatives: [],
        reasoning: "No specific keyword matched, defaulting to coder",
      };
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    const best = matches[0];
    const alternatives: RoutingAlternative[] = matches.slice(1).map(m => ({
      agent: m.agent,
      confidence: m.confidence,
    }));

    return {
      agent: best.agent,
      confidence: best.confidence,
      alternatives,
      reasoning: `Matched keyword '${best.keyword}' suggesting ${best.agent} specialization`,
    };
  }
}
