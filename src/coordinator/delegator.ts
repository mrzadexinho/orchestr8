import type {
  TaskDefinition,
  AgentState,
  DelegationPlan,
  ExecutionStrategy,
  ParallelAssignment,
  AgentAssignment,
} from './types.js';
import { TaskAnalyzer } from './task-analyzer.js';
import { AgentScorer } from './agent-scorer.js';

export class Delegator {
  private analyzer: TaskAnalyzer;
  private scorer: AgentScorer;

  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.scorer = new AgentScorer();
  }

  createPlan(task: TaskDefinition, agents: AgentState[]): DelegationPlan {
    if (agents.length === 0) {
      throw new Error('No agents available');
    }

    const analysis = this.analyzer.analyze(task);
    const scores = this.scorer.scoreAgents(agents, analysis.requiredCapabilities);

    const primaryScore = scores[0];
    const primaryAgent: AgentAssignment = {
      agentId: primaryScore.agentId,
      taskId: task.id,
      score: primaryScore.totalScore,
      assignedAt: Date.now(),
    };

    const backupAgents: AgentAssignment[] = scores
      .slice(1)
      .filter((s) => s.totalScore >= 0.3)
      .slice(0, 2)
      .map((s) => ({
        agentId: s.agentId,
        taskId: task.id,
        score: s.totalScore,
        assignedAt: Date.now(),
      }));

    const parallelAssignments: ParallelAssignment[] = analysis.subtasks.map(
      (subtask, index) => {
        const agentIndex = index % scores.length;
        return {
          subtaskId: subtask.id,
          agentId: scores[agentIndex].agentId,
          dependencies: subtask.dependencies,
        };
      },
    );

    const strategy = this.selectStrategy(analysis.subtasks, analysis.complexity);

    return {
      planId: `plan-${task.id}-${Date.now()}`,
      taskId: task.id,
      primaryAgent,
      backupAgents,
      parallelAssignments,
      strategy,
      estimatedCompletionMs: analysis.estimatedDurationMs,
      timestamp: Date.now(),
    };
  }

  private selectStrategy(
    subtasks: { id: string; dependencies: string[] }[],
    complexity: number,
  ): ExecutionStrategy {
    if (complexity > 0.7) {
      return 'fan-out-fan-in';
    }

    if (subtasks.length === 0) {
      return 'sequential';
    }

    const hasDependencies = subtasks.some((s) => s.dependencies.length > 0);

    if (!hasDependencies && subtasks.length >= 2) {
      return 'parallel';
    }

    if (hasDependencies && subtasks.length >= 3) {
      return 'pipeline';
    }

    return 'hybrid';
  }
}
