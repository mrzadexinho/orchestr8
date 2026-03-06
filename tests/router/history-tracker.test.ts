import { describe, it, expect } from 'vitest';
import { HistoryTracker } from '../../src/router/history-tracker.js';
import { TaskOutcome } from '../../src/router/types.js';

function makeOutcome(overrides: Partial<TaskOutcome> = {}): TaskOutcome {
  return {
    taskId: 'task-1',
    agent: 'coder',
    taskType: 'feature',
    success: true,
    quality: 0.8,
    durationMs: 1000,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('HistoryTracker', () => {
  it('records outcome and queries performance', () => {
    const tracker = new HistoryTracker();
    tracker.recordOutcome(makeOutcome({ agent: 'coder', success: true, quality: 0.9 }));

    const perf = tracker.getPerformance('coder');
    expect(perf.taskCount).toBe(1);
    expect(perf.successRate).toBe(1);
    expect(perf.avgQuality).toBe(0.9);
  });

  it('calculates success rate correctly', () => {
    const tracker = new HistoryTracker();
    tracker.recordOutcome(makeOutcome({ agent: 'coder', success: true, quality: 0.8 }));
    tracker.recordOutcome(makeOutcome({ agent: 'coder', success: false, quality: 0.4 }));
    tracker.recordOutcome(makeOutcome({ agent: 'coder', success: true, quality: 0.9 }));

    const perf = tracker.getPerformance('coder');
    expect(perf.taskCount).toBe(3);
    expect(perf.successRate).toBeCloseTo(2 / 3);
    expect(perf.avgQuality).toBeCloseTo((0.8 + 0.4 + 0.9) / 3);
  });

  it('returns zero counts for no history', () => {
    const tracker = new HistoryTracker();
    const perf = tracker.getPerformance('unknown-agent');
    expect(perf.taskCount).toBe(0);
    expect(perf.successRate).toBe(0);
    expect(perf.avgQuality).toBe(0);
  });

  it('tracks multiple agents independently', () => {
    const tracker = new HistoryTracker();
    tracker.recordOutcome(makeOutcome({ agent: 'coder', success: true, quality: 0.9 }));
    tracker.recordOutcome(makeOutcome({ agent: 'reviewer', success: false, quality: 0.3 }));

    const coderPerf = tracker.getPerformance('coder');
    const reviewerPerf = tracker.getPerformance('reviewer');

    expect(coderPerf.successRate).toBe(1);
    expect(reviewerPerf.successRate).toBe(0);
    expect(coderPerf.taskCount).toBe(1);
    expect(reviewerPerf.taskCount).toBe(1);
  });

  it('filters by taskType when provided', () => {
    const tracker = new HistoryTracker();
    tracker.recordOutcome(makeOutcome({ agent: 'coder', taskType: 'feature', success: true, quality: 0.9 }));
    tracker.recordOutcome(makeOutcome({ agent: 'coder', taskType: 'bugfix', success: false, quality: 0.3 }));

    const featurePerf = tracker.getPerformance('coder', 'feature');
    expect(featurePerf.taskCount).toBe(1);
    expect(featurePerf.successRate).toBe(1);
  });
});
