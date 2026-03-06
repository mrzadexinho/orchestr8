import { describe, it, expect } from 'vitest';
import { Delegator } from '../../src/coordinator/delegator.js';
import type { TaskDefinition, AgentState } from '../../src/coordinator/types.js';

describe('Delegator', () => {
  const delegator = new Delegator();

  function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
    return {
      id: 'task-1',
      description: 'Build a feature',
      type: 'coding',
      priority: 'normal',
      ...overrides,
    };
  }

  function makeAgent(overrides: Partial<AgentState> = {}): AgentState {
    return {
      id: 'agent-1',
      type: 'general',
      capabilities: [],
      status: 'idle',
      workload: 0,
      successRate: 0.9,
      health: 1.0,
      ...overrides,
    };
  }

  it('should create a plan with primary and backup agents', () => {
    const agents = [
      makeAgent({ id: 'a1', workload: 0.1 }),
      makeAgent({ id: 'a2', workload: 0.3 }),
      makeAgent({ id: 'a3', workload: 0.5 }),
      makeAgent({ id: 'a4', workload: 0.8, health: 0.2, successRate: 0.3 }),
    ];
    const plan = delegator.createPlan(makeTask(), agents);

    expect(plan.primaryAgent).toBeDefined();
    expect(plan.primaryAgent.agentId).toBeTruthy();
    expect(plan.backupAgents.length).toBeGreaterThanOrEqual(1);
    expect(plan.backupAgents.length).toBeLessThanOrEqual(2);
    // Backup agents should not include primary
    for (const backup of plan.backupAgents) {
      expect(backup.agentId).not.toBe(plan.primaryAgent.agentId);
    }
  });

  it('should select sequential strategy for tasks with no subtasks', () => {
    const agents = [makeAgent()];
    const plan = delegator.createPlan(
      makeTask({ type: 'coordination' }), // no auto-decomposition
      agents,
    );
    expect(plan.strategy).toBe('sequential');
  });

  it('should select parallel strategy for independent subtasks', () => {
    const agents = [makeAgent(), makeAgent({ id: 'a2' })];
    // Testing type produces 2 subtasks with no dependencies
    const plan = delegator.createPlan(makeTask({ type: 'testing' }), agents);
    expect(plan.strategy).toBe('parallel');
  });

  it('should select pipeline strategy for dependent subtasks (3+)', () => {
    const agents = [makeAgent()];
    // Coding produces 3 subtasks with dependencies: design -> implement -> test
    const plan = delegator.createPlan(makeTask({ type: 'coding' }), agents);
    expect(plan.strategy).toBe('pipeline');
  });

  it('should select fan-out-fan-in for high complexity', () => {
    const agents = [makeAgent()];
    const plan = delegator.createPlan(
      makeTask({
        type: 'coordination',
        priority: 'critical',
        subtasks: Array.from({ length: 5 }, (_, i) => ({
          id: `s${i}`,
          name: `sub${i}`,
          description: 'subtask',
          type: 'coding' as const,
          priority: 'normal' as const,
          dependencies: [],
          estimatedDurationMs: 1000,
          requiredCapabilities: [],
        })),
        dependencies: ['d1', 'd2', 'd3'],
      }),
      agents,
    );
    expect(plan.strategy).toBe('fan-out-fan-in');
  });

  it('should throw when agents array is empty', () => {
    expect(() => delegator.createPlan(makeTask(), [])).toThrow('No agents available');
  });

  it('should map subtasks to agents in parallel assignments', () => {
    const agents = [
      makeAgent({ id: 'a1' }),
      makeAgent({ id: 'a2', workload: 0.2 }),
    ];
    // coding -> 3 subtasks
    const plan = delegator.createPlan(makeTask({ type: 'coding' }), agents);
    expect(plan.parallelAssignments.length).toBe(3);
    for (const assignment of plan.parallelAssignments) {
      expect(assignment.subtaskId).toBeTruthy();
      expect(assignment.agentId).toBeTruthy();
    }
  });

  it('should include taskId and planId in the plan', () => {
    const agents = [makeAgent()];
    const plan = delegator.createPlan(makeTask({ id: 'my-task' }), agents);
    expect(plan.taskId).toBe('my-task');
    expect(plan.planId).toContain('my-task');
  });

  it('should have no backups when only one agent and score >= 0.3 check does not apply', () => {
    const agents = [makeAgent()];
    const plan = delegator.createPlan(makeTask(), agents);
    expect(plan.backupAgents).toHaveLength(0);
  });
});
