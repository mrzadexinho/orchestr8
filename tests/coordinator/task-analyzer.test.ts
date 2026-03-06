import { describe, it, expect } from 'vitest';
import { TaskAnalyzer } from '../../src/coordinator/task-analyzer.js';
import type { TaskDefinition } from '../../src/coordinator/types.js';

describe('TaskAnalyzer', () => {
  const analyzer = new TaskAnalyzer();

  function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
    return {
      id: 'task-1',
      description: 'A simple task',
      type: 'coding',
      priority: 'normal',
      ...overrides,
    };
  }

  it('should produce low complexity for a simple task', () => {
    const result = analyzer.analyze(makeTask({ type: 'review' }));
    // base 0.3 + type weight 0.1 + priority 1.0 = 0.4
    expect(result.complexity).toBeCloseTo(0.4, 5);
  });

  it('should increase complexity per subtask', () => {
    const withoutSubtasks = analyzer.analyze(makeTask({ type: 'review' }));
    const withSubtasks = analyzer.analyze(
      makeTask({
        type: 'review',
        subtasks: [
          {
            id: 's1',
            name: 'sub1',
            description: 'subtask',
            type: 'coding',
            priority: 'normal',
            dependencies: [],
            estimatedDurationMs: 1000,
            requiredCapabilities: [],
          },
          {
            id: 's2',
            name: 'sub2',
            description: 'subtask',
            type: 'coding',
            priority: 'normal',
            dependencies: [],
            estimatedDurationMs: 1000,
            requiredCapabilities: [],
          },
        ],
      }),
    );
    expect(withSubtasks.complexity).toBeGreaterThan(withoutSubtasks.complexity);
  });

  it('should increase complexity per dependency', () => {
    const noDeps = analyzer.analyze(makeTask({ type: 'review' }));
    const withDeps = analyzer.analyze(
      makeTask({ type: 'review', dependencies: ['dep1', 'dep2'] }),
    );
    expect(withDeps.complexity).toBeGreaterThan(noDeps.complexity);
  });

  it('should apply priority multiplier', () => {
    const normal = analyzer.analyze(makeTask({ type: 'review', priority: 'normal' }));
    const critical = analyzer.analyze(makeTask({ type: 'review', priority: 'critical' }));
    expect(critical.complexity).toBeGreaterThan(normal.complexity);
  });

  it('should apply type weights correctly', () => {
    // consensus type weight = 0.25, review type weight = 0.1
    // But consensus is not a valid TaskType in the union; use coordination (0.2) vs review (0.1)
    const coordination = analyzer.analyze(makeTask({ type: 'coordination' }));
    const review = analyzer.analyze(makeTask({ type: 'review' }));
    expect(coordination.complexity).toBeGreaterThan(review.complexity);
  });

  it('should auto-decompose coding tasks into 3 subtasks', () => {
    const result = analyzer.analyze(makeTask({ type: 'coding' }));
    expect(result.subtasks).toHaveLength(3);
    expect(result.subtasks.map((s) => s.name)).toEqual(['design', 'implement', 'test']);
    // implement depends on design
    expect(result.subtasks[1].dependencies).toContain(result.subtasks[0].id);
    // test depends on implement
    expect(result.subtasks[2].dependencies).toContain(result.subtasks[1].id);
  });

  it('should auto-decompose testing tasks into 2 subtasks', () => {
    const result = analyzer.analyze(makeTask({ type: 'testing' }));
    expect(result.subtasks).toHaveLength(2);
  });

  it('should auto-decompose research tasks into 2 subtasks', () => {
    const result = analyzer.analyze(makeTask({ type: 'research' }));
    expect(result.subtasks).toHaveLength(2);
  });

  it('should not auto-decompose coordination tasks', () => {
    const result = analyzer.analyze(makeTask({ type: 'coordination' }));
    expect(result.subtasks).toHaveLength(0);
  });

  it('should extract capabilities from description keywords', () => {
    const result = analyzer.analyze(
      makeTask({ description: 'Implement security auth for the test system with perf tuning' }),
    );
    expect(result.requiredCapabilities).toContain('security');
    expect(result.requiredCapabilities).toContain('authentication');
    expect(result.requiredCapabilities).toContain('testing');
    expect(result.requiredCapabilities).toContain('performance');
  });

  it('should calculate confidence correctly', () => {
    const result = analyzer.analyze(makeTask({ description: 'Simple task' }));
    // confidence = 0.5 + 0.2*(1 - complexity) + min(0*0.05, 0.15)
    // No keywords match, so capabilities = 0
    const expected = 0.5 + 0.2 * (1 - result.complexity);
    expect(result.confidence).toBeCloseTo(expected, 5);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('should cap confidence at 0.95', () => {
    // Even with many capabilities, confidence should not exceed 0.95
    const result = analyzer.analyze(
      makeTask({
        description: 'security auth test perf database api deploy',
        type: 'review',
      }),
    );
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('should estimate duration as complexity * 60000', () => {
    const result = analyzer.analyze(makeTask({ type: 'review' }));
    expect(result.estimatedDurationMs).toBeCloseTo(result.complexity * 60000, 0);
  });

  it('should cap complexity at 1.0', () => {
    const result = analyzer.analyze(
      makeTask({
        type: 'coordination',
        priority: 'critical',
        subtasks: Array.from({ length: 10 }, (_, i) => ({
          id: `s${i}`,
          name: `sub${i}`,
          description: 'subtask',
          type: 'coding' as const,
          priority: 'normal' as const,
          dependencies: [],
          estimatedDurationMs: 1000,
          requiredCapabilities: [],
        })),
        dependencies: Array.from({ length: 10 }, (_, i) => `dep${i}`),
      }),
    );
    expect(result.complexity).toBeLessThanOrEqual(1.0);
  });
});
