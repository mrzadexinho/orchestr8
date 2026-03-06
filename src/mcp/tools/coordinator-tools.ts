import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TaskAnalyzer } from '../../coordinator/task-analyzer.js';
import { AgentScorer } from '../../coordinator/agent-scorer.js';
import { Delegator } from '../../coordinator/delegator.js';
import type { TaskPriority, TaskType, AgentState } from '../../coordinator/types.js';

const analyzer = new TaskAnalyzer();
const scorer = new AgentScorer();
const delegator = new Delegator();

export function registerCoordinatorTools(server: McpServer) {
  server.tool(
    'analyze_task',
    'Analyze a task for complexity, required capabilities, and subtask decomposition',
    {
      id: z.string().describe('Task ID'),
      description: z.string().describe('Task description'),
      type: z.enum(['coding', 'testing', 'research', 'coordination', 'security', 'review']),
      priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
    },
    async ({ id, description, type, priority }) => {
      const analysis = analyzer.analyze({
        id,
        description,
        type: type as TaskType,
        priority: (priority ?? 'normal') as TaskPriority,
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            taskId: analysis.taskId,
            complexity: Math.round(analysis.complexity * 100) / 100,
            estimatedDurationMs: analysis.estimatedDurationMs,
            requiredCapabilities: analysis.requiredCapabilities,
            subtaskCount: analysis.subtasks.length,
            subtasks: analysis.subtasks.map(s => ({ name: s.name, type: s.type, deps: s.dependencies })),
            confidence: Math.round(analysis.confidence * 100) / 100,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'score_agents',
    'Score agents for a task based on capabilities, load, performance, health, and availability',
    {
      requiredCapabilities: z.array(z.string()).describe('Capabilities needed for the task'),
      agents: z.array(z.object({
        id: z.string(),
        type: z.string(),
        capabilities: z.array(z.string()),
        status: z.enum(['idle', 'busy', 'error', 'offline']),
        workload: z.number().min(0).max(1),
        successRate: z.number().min(0).max(1),
        health: z.number().min(0).max(1),
      })).describe('Available agents to score'),
    },
    async ({ requiredCapabilities, agents }) => {
      const scores = scorer.scoreAgents(agents as AgentState[], requiredCapabilities);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(scores.map(s => ({
            agentId: s.agentId,
            totalScore: Math.round(s.totalScore * 1000) / 1000,
            breakdown: {
              capability: Math.round(s.capabilityScore * 100) / 100,
              load: Math.round(s.loadScore * 100) / 100,
              performance: Math.round(s.performanceScore * 100) / 100,
              health: Math.round(s.healthScore * 100) / 100,
              availability: Math.round(s.availabilityScore * 100) / 100,
            },
          })), null, 2),
        }],
      };
    },
  );

  server.tool(
    'create_delegation_plan',
    'Create a full delegation plan: analyze task, score agents, assign primary + backups, select strategy',
    {
      task: z.object({
        id: z.string(),
        description: z.string(),
        type: z.enum(['coding', 'testing', 'research', 'coordination', 'security', 'review']),
        priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
      }),
      agents: z.array(z.object({
        id: z.string(),
        type: z.string(),
        capabilities: z.array(z.string()),
        status: z.enum(['idle', 'busy', 'error', 'offline']),
        workload: z.number().min(0).max(1),
        successRate: z.number().min(0).max(1),
        health: z.number().min(0).max(1),
      })),
    },
    async ({ task, agents }) => {
      try {
        const plan = delegator.createPlan(
          { ...task, priority: (task.priority ?? 'normal') as TaskPriority, type: task.type as TaskType },
          agents as AgentState[],
        );
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              planId: plan.planId,
              strategy: plan.strategy,
              primaryAgent: plan.primaryAgent.agentId,
              backupAgents: plan.backupAgents.map(a => a.agentId),
              parallelAssignments: plan.parallelAssignments.length,
              estimatedCompletionMs: plan.estimatedCompletionMs,
            }, null, 2),
          }],
        };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
    },
  );
}
