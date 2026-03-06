import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PatternStore } from '../../learning/pattern-store.js';
import { PatternLifecycle } from '../../learning/lifecycle.js';

const store = new PatternStore();
const lifecycle = new PatternLifecycle(store);

export function registerLearningTools(server: McpServer) {
  server.tool(
    'store_pattern',
    'Store a learned pattern from a successful task or approach',
    {
      content: z.string().describe('What was learned'),
      strategy: z.string().describe('The strategy or approach used'),
      domain: z.string().describe('Domain (e.g., security, testing, coding)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      success: z.boolean().optional().describe('Whether this pattern led to success'),
    },
    async ({ content, strategy, domain, tags, success }) => {
      const pattern = store.store({ content, strategy, domain, tags, success });
      return {
        content: [{
          type: 'text' as const,
          text: `Stored pattern "${pattern.id}" in ${domain} domain (quality: ${pattern.quality})`,
        }],
      };
    },
  );

  server.tool(
    'search_patterns',
    'Search for relevant learned patterns by content similarity',
    {
      content: z.string().describe('Content to search for'),
      limit: z.number().optional().describe('Max results (default: 5)'),
    },
    async ({ content, limit }) => {
      const results = store.search(content, limit ?? 5);
      return {
        content: [{
          type: 'text' as const,
          text: results.length === 0
            ? 'No matching patterns found'
            : JSON.stringify(results.map(r => ({
                id: r.pattern.id,
                content: r.pattern.content,
                strategy: r.pattern.strategy,
                domain: r.pattern.domain,
                quality: Math.round(r.pattern.quality * 100) / 100,
                usageCount: r.pattern.usageCount,
                similarity: Math.round(r.similarity * 100) / 100,
              })), null, 2),
        }],
      };
    },
  );

  server.tool(
    'consolidate_patterns',
    'Run pattern lifecycle: promote high-quality patterns, prune old ones, deduplicate',
    {},
    async () => {
      const result = lifecycle.consolidate();
      return {
        content: [{
          type: 'text' as const,
          text: `Consolidation complete: ${result.promoted} promoted, ${result.pruned} pruned, ${result.deduplicated} deduplicated`,
        }],
      };
    },
  );
}
