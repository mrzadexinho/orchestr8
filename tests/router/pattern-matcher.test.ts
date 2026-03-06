import { describe, it, expect } from 'vitest';
import { PatternMatcher } from '../../src/router/pattern-matcher.js';

describe('PatternMatcher', () => {
  const matcher = new PatternMatcher();

  it('routes security keywords to security-architect', () => {
    const result = matcher.match('Fix authentication vulnerability');
    expect(result.agent).toBe('security-architect');
    expect(result.confidence).toBe(0.85);
  });

  it('routes test keywords to test-architect', () => {
    const result = matcher.match('Write unit tests with mocks');
    expect(result.agent).toBe('test-architect');
    expect(result.confidence).toBe(0.85);
  });

  it('routes performance keywords to performance-engineer', () => {
    const result = matcher.match('Optimize cache for speed');
    expect(result.agent).toBe('performance-engineer');
    expect(result.confidence).toBe(0.85);
  });

  it('routes architecture keywords to core-architect', () => {
    const result = matcher.match('Refactor domain design patterns');
    expect(result.agent).toBe('core-architect');
    expect(result.confidence).toBe(0.85);
  });

  it('routes review keywords to reviewer', () => {
    const result = matcher.match('Audit and review the code');
    expect(result.agent).toBe('reviewer');
    expect(result.confidence).toBe(0.80);
  });

  it('routes documentation keywords to documenter', () => {
    const result = matcher.match('Write api doc and readme');
    expect(result.agent).toBe('documenter');
    expect(result.confidence).toBe(0.80);
  });

  it('defaults to coder for unknown tasks', () => {
    const result = matcher.match('implement the feature');
    expect(result.agent).toBe('coder');
    expect(result.confidence).toBe(0.70);
    expect(result.alternatives).toHaveLength(0);
  });

  it('populates alternatives from remaining matches', () => {
    const result = matcher.match('review the test coverage');
    expect(result.alternatives.length).toBeGreaterThan(0);
    for (const alt of result.alternatives) {
      expect(alt.agent).not.toBe(result.agent);
      expect(alt.confidence).toBeGreaterThan(0);
    }
  });

  it('includes matched keyword in reasoning', () => {
    const result = matcher.match('Fix the security issue');
    expect(result.reasoning).toContain('security');
    expect(result.reasoning).toContain('security-architect');
  });
});
