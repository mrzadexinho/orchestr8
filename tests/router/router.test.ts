import { describe, it, expect } from 'vitest';
import { Router } from '../../src/router/index.js';

describe('Router', () => {
  it('routes using pattern matching', () => {
    const router = new Router();
    const result = router.route('Fix security vulnerability');
    expect(result.agent).toBe('security-architect');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('boosts confidence from history', () => {
    const router = new Router();

    // Record successful outcomes for security-architect
    router.recordOutcome({
      taskId: 't1',
      agent: 'security-architect',
      taskType: 'security',
      success: true,
      quality: 0.9,
      durationMs: 1000,
      timestamp: Date.now(),
    });

    const result = router.route('Fix security vulnerability', 'security');
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.historicalPerformance).toBeDefined();
    expect(result.historicalPerformance!.taskCount).toBe(1);
  });

  it('recordOutcome works end-to-end', () => {
    const router = new Router();

    router.recordOutcome({
      taskId: 't1',
      agent: 'coder',
      taskType: 'feature',
      success: true,
      quality: 0.8,
      durationMs: 500,
      timestamp: Date.now(),
    });

    router.recordOutcome({
      taskId: 't2',
      agent: 'coder',
      taskType: 'feature',
      success: true,
      quality: 0.9,
      durationMs: 600,
      timestamp: Date.now(),
    });

    const result = router.route('build a new widget', 'feature');
    expect(result.agent).toBe('coder');
    expect(result.confidence).toBeGreaterThan(0.70);
    expect(result.historicalPerformance!.taskCount).toBe(2);
  });
});
