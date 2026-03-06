import type { AgentState, AgentScore } from './types.js';

const WEIGHTS = {
  capability: 0.30,
  load: 0.20,
  performance: 0.25,
  health: 0.15,
  availability: 0.10,
};

const AVAILABILITY_SCORES: Record<string, number> = {
  idle: 1.0,
  busy: 0.3,
  error: 0.0,
  offline: 0.0,
};

export class AgentScorer {
  scoreAgents(agents: AgentState[], requiredCapabilities: string[]): AgentScore[] {
    const scores = agents.map((agent) => this.scoreAgent(agent, requiredCapabilities));
    scores.sort((a, b) => b.totalScore - a.totalScore);
    return scores;
  }

  private scoreAgent(agent: AgentState, requiredCapabilities: string[]): AgentScore {
    const capabilityScore = this.calculateCapabilityScore(agent, requiredCapabilities);
    const loadScore = 1 - agent.workload;
    const performanceScore = agent.successRate;
    const healthScore = agent.health;
    const availabilityScore = AVAILABILITY_SCORES[agent.status] ?? 0.0;

    const totalScore =
      capabilityScore * WEIGHTS.capability +
      loadScore * WEIGHTS.load +
      performanceScore * WEIGHTS.performance +
      healthScore * WEIGHTS.health +
      availabilityScore * WEIGHTS.availability;

    return {
      agentId: agent.id,
      totalScore,
      capabilityScore,
      loadScore,
      performanceScore,
      healthScore,
      availabilityScore,
    };
  }

  private calculateCapabilityScore(
    agent: AgentState,
    requiredCapabilities: string[],
  ): number {
    let score = 0;

    // Type match: check if any required capability matches agent type
    if (requiredCapabilities.some((cap) => agent.type.includes(cap) || cap.includes(agent.type))) {
      score += 0.3;
    }

    // Each matching capability
    for (const cap of requiredCapabilities) {
      if (agent.capabilities.includes(cap)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }
}
