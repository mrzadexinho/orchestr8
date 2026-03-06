import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Router } from '../../router/index.js';

const router = new Router();

export function registerRouterTools(server: McpServer) {
  server.tool(
    'route_task',
    'Route a task to the best agent based on keywords and historical performance',
    {
      description: z.string().describe('Task description to analyze'),
      taskType: z.string().optional().describe('Optional task type for history lookup'),
    },
    async ({ description, taskType }) => {
      const result = router.route(description, taskType);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            recommendedAgent: result.agent,
            confidence: Math.round(result.confidence * 100) / 100,
            reasoning: result.reasoning,
            alternatives: result.alternatives.map(a => ({
              agent: a.agent,
              confidence: Math.round(a.confidence * 100) / 100,
            })),
            historicalPerformance: result.historicalPerformance,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'record_outcome',
    'Record a task outcome to improve future routing decisions',
    {
      taskId: z.string().describe('Task ID'),
      agent: z.string().describe('Agent that handled the task'),
      taskType: z.string().describe('Type of task'),
      success: z.boolean().describe('Whether the task succeeded'),
      quality: z.number().min(0).max(1).describe('Quality score 0-1'),
      durationMs: z.number().describe('Duration in milliseconds'),
    },
    async ({ taskId, agent, taskType, success, quality, durationMs }) => {
      router.recordOutcome({
        taskId,
        agent,
        taskType,
        success,
        quality,
        durationMs,
        timestamp: Date.now(),
      });
      return {
        content: [{
          type: 'text' as const,
          text: `Recorded outcome for task "${taskId}": ${success ? 'success' : 'failure'} (quality: ${quality})`,
        }],
      };
    },
  );
}
