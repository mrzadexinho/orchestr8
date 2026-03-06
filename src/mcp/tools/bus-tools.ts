import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MessageBus } from '../../message-bus/bus.js';
import type { MessageType, MessagePriority } from '../../message-bus/types.js';

const bus = new MessageBus();
const messageLog: Array<{ id: string; from: string; to: string; type: string; payload: unknown; priority: string; timestamp: number }> = [];

bus.subscribe('__logger__', (msg) => {
  messageLog.push({
    id: msg.id,
    from: msg.from,
    to: msg.to,
    type: msg.type,
    payload: msg.payload,
    priority: msg.priority,
    timestamp: msg.timestamp,
  });
  if (messageLog.length > 1000) messageLog.shift();
});

export function registerBusTools(server: McpServer) {
  server.tool(
    'publish_message',
    'Publish a message to the agent message bus',
    {
      type: z.enum(['task_assign', 'task_complete', 'task_fail', 'heartbeat', 'status_update', 'request', 'response', 'broadcast']),
      from: z.string().describe('Sender agent ID'),
      to: z.string().describe('Recipient agent ID or "broadcast"'),
      payload: z.any().describe('Message payload'),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    },
    async ({ type, from, to, payload, priority }) => {
      const msg = bus.publish({
        type: type as MessageType,
        from,
        to,
        payload,
        priority: priority as MessagePriority,
      });
      return {
        content: [{
          type: 'text' as const,
          text: `Published message ${msg.id} from "${from}" to "${to}" (priority: ${msg.priority})`,
        }],
      };
    },
  );

  server.tool(
    'get_messages',
    'Get recent messages from the bus log',
    {
      limit: z.number().optional().describe('Max messages to return (default: 20)'),
      from: z.string().optional().describe('Filter by sender'),
      to: z.string().optional().describe('Filter by recipient'),
    },
    async ({ limit, from, to }) => {
      let filtered = messageLog;
      if (from) filtered = filtered.filter(m => m.from === from);
      if (to) filtered = filtered.filter(m => m.to === to);
      const results = filtered.slice(-(limit ?? 20));
      return {
        content: [{
          type: 'text' as const,
          text: results.length === 0
            ? 'No messages found'
            : JSON.stringify(results, null, 2),
        }],
      };
    },
  );
}
