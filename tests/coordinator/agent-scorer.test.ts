import { describe, it, expect } from 'vitest';
import { AgentScorer } from '../../src/coordinator/agent-scorer.js';
import type { AgentState } from '../../src/coordinator/types.js';

describe('AgentScorer', () => {
  const scorer = new AgentScorer();

  function makeAgent(overrides: Partial<AgentState> = {}): AgentState {
    return {
      id: 'agent-1',
      type: 'general',
      capabilities: [],
      status: 'idle',
      workload: 0,
      successRate: 1.0,
      health: 1.0,
      ...overrides,
    };
  }

  it('should compute 6-dimension scoring', () => {
    const agents = [makeAgent()];
    const scores = scorer.scoreAgents(agents, []);
    const s = scores[0];

    expect(s).toHaveProperty('capabilityScore');
    expect(s).toHaveProperty('loadScore');
    expect(s).toHaveProperty('performanceScore');
    expect(s).toHaveProperty('healthScore');
    expect(s).toHaveProperty('availabilityScore');
    expect(s).toHaveProperty('totalScore');
  });

  it('should score idle agents higher than busy agents', () => {
    const agents = [
      makeAgent({ id: 'idle', status: 'idle' }),
      makeAgent({ id: 'busy', status: 'busy' }),
    ];
    const scores = scorer.scoreAgents(agents, []);
    const idleScore = scores.find((s) => s.agentId === 'idle')!;
    const busyScore = scores.find((s) => s.agentId === 'busy')!;
    expect(idleScore.availabilityScore).toBeGreaterThan(busyScore.availabilityScore);
    expect(idleScore.totalScore).toBeGreaterThan(busyScore.totalScore);
  });

  it('should boost score for capability matching', () => {
    const agents = [
      makeAgent({ id: 'match', capabilities: ['security', 'testing'] }),
      makeAgent({ id: 'nomatch', capabilities: [] }),
    ];
    const scores = scorer.scoreAgents(agents, ['security', 'testing']);
    const matchScore = scores.find((s) => s.agentId === 'match')!;
    const noMatchScore = scores.find((s) => s.agentId === 'nomatch')!;
    expect(matchScore.capabilityScore).toBeGreaterThan(noMatchScore.capabilityScore);
    expect(matchScore.totalScore).toBeGreaterThan(noMatchScore.totalScore);
  });

  it('should prefer less-loaded agents', () => {
    const agents = [
      makeAgent({ id: 'light', workload: 0.2 }),
      makeAgent({ id: 'heavy', workload: 0.9 }),
    ];
    const scores = scorer.scoreAgents(agents, []);
    const lightScore = scores.find((s) => s.agentId === 'light')!;
    const heavyScore = scores.find((s) => s.agentId === 'heavy')!;
    expect(lightScore.loadScore).toBeGreaterThan(heavyScore.loadScore);
    expect(lightScore.totalScore).toBeGreaterThan(heavyScore.totalScore);
  });

  it('should return scores sorted descending by totalScore', () => {
    const agents = [
      makeAgent({ id: 'low', workload: 0.9, successRate: 0.5, health: 0.5 }),
      makeAgent({ id: 'high', workload: 0.1, successRate: 0.95, health: 1.0 }),
      makeAgent({ id: 'mid', workload: 0.5, successRate: 0.7, health: 0.8 }),
    ];
    const scores = scorer.scoreAgents(agents, []);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].totalScore).toBeGreaterThanOrEqual(scores[i].totalScore);
    }
  });

  it('should give low total score when health is zero', () => {
    const agents = [
      makeAgent({ id: 'healthy', health: 1.0 }),
      makeAgent({ id: 'unhealthy', health: 0.0 }),
    ];
    const scores = scorer.scoreAgents(agents, []);
    const healthy = scores.find((s) => s.agentId === 'healthy')!;
    const unhealthy = scores.find((s) => s.agentId === 'unhealthy')!;
    expect(unhealthy.healthScore).toBe(0);
    expect(unhealthy.totalScore).toBeLessThan(healthy.totalScore);
  });

  it('should give zero availability for offline and error agents', () => {
    const agents = [
      makeAgent({ id: 'offline', status: 'offline' }),
      makeAgent({ id: 'error', status: 'error' }),
    ];
    const scores = scorer.scoreAgents(agents, []);
    for (const s of scores) {
      expect(s.availabilityScore).toBe(0);
    }
  });
});
