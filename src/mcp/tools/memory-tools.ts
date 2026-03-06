import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HybridBackend } from '../../memory/hybrid-backend.js';
import { createMemoryEntry } from '../../memory/types.js';
import type { QueryType } from '../../memory/types.js';

export function registerMemoryTools(server: McpServer, memory: HybridBackend) {
  server.tool(
    'memory_store',
    'Store a memory entry in shared namespace for agent coordination',
    {
      key: z.string().describe('Unique key for this entry'),
      content: z.string().describe('Content to store'),
      namespace: z.string().optional().describe('Namespace for isolation (default: "default")'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      type: z.enum(['episodic', 'semantic', 'procedural', 'working', 'cache']).optional(),
    },
    async ({ key, content, namespace, tags, type }) => {
      const entry = createMemoryEntry({ key, content, namespace, tags, type });
      await memory.store(entry);
      return { content: [{ type: 'text' as const, text: `Stored entry "${key}" in namespace "${entry.namespace}" (id: ${entry.id})` }] };
    },
  );

  server.tool(
    'memory_retrieve',
    'Retrieve a specific memory entry by key',
    {
      key: z.string().describe('Key to retrieve'),
      namespace: z.string().optional().describe('Namespace to search in'),
    },
    async ({ key, namespace }) => {
      const entry = await memory.retrieve(key, namespace);
      if (!entry) {
        return { content: [{ type: 'text' as const, text: `No entry found for key "${key}"` }] };
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            key: entry.key,
            content: entry.content,
            namespace: entry.namespace,
            tags: entry.tags,
            type: entry.type,
            version: entry.version,
            accessCount: entry.accessCount,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'memory_search',
    'Search memory entries by prefix, tags, or semantic similarity',
    {
      queryType: z.enum(['prefix', 'tag', 'semantic', 'exact']).describe('Type of search'),
      key: z.string().optional().describe('Key or prefix to search for'),
      tags: z.array(z.string()).optional().describe('Tags to filter by'),
      content: z.string().optional().describe('Content for semantic search'),
      namespace: z.string().optional().describe('Namespace to search in'),
      limit: z.number().optional().describe('Max results to return'),
    },
    async ({ queryType, key, tags, content, namespace, limit }) => {
      const results = await memory.query({
        type: queryType as QueryType,
        key,
        keyPrefix: queryType === 'prefix' ? key : undefined,
        tags,
        content,
        namespace,
        limit: limit ?? 10,
      });
      return {
        content: [{
          type: 'text' as const,
          text: results.length === 0
            ? 'No results found'
            : JSON.stringify(results.map(r => ({
                key: r.entry.key,
                content: r.entry.content,
                namespace: r.entry.namespace,
                tags: r.entry.tags,
                score: r.score,
                source: r.source,
              })), null, 2),
        }],
      };
    },
  );

  server.tool(
    'memory_delete',
    'Delete a memory entry by key',
    {
      key: z.string().describe('Key of entry to delete'),
      namespace: z.string().optional().describe('Namespace of the entry'),
    },
    async ({ key, namespace }) => {
      const entry = await memory.retrieve(key, namespace);
      if (!entry) {
        return { content: [{ type: 'text' as const, text: `No entry found for key "${key}"` }] };
      }
      await memory.delete(entry.id);
      return { content: [{ type: 'text' as const, text: `Deleted entry "${key}" from namespace "${entry.namespace}"` }] };
    },
  );
}
