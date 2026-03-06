import { TaskOutcome, HistoricalPerformance } from './types.js';

export class HistoryTracker {
  private outcomes: Map<string, TaskOutcome[]> = new Map();

  recordOutcome(outcome: TaskOutcome): void {
    const key = outcome.agent;
    if (!this.outcomes.has(key)) {
      this.outcomes.set(key, []);
    }
    this.outcomes.get(key)!.push(outcome);
  }

  getPerformance(agent: string, taskType?: string): HistoricalPerformance {
    const agentOutcomes = this.outcomes.get(agent);
    if (!agentOutcomes || agentOutcomes.length === 0) {
      return { successRate: 0, avgQuality: 0, taskCount: 0 };
    }

    let filtered = agentOutcomes;
    if (taskType) {
      filtered = agentOutcomes.filter(o => o.taskType === taskType);
    }

    if (filtered.length === 0) {
      return { successRate: 0, avgQuality: 0, taskCount: 0 };
    }

    const successCount = filtered.filter(o => o.success).length;
    const successRate = successCount / filtered.length;
    const avgQuality = filtered.reduce((sum, o) => sum + o.quality, 0) / filtered.length;

    return {
      successRate,
      avgQuality,
      taskCount: filtered.length,
    };
  }
}
