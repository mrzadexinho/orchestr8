#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SQLiteBackend } from '../memory/sqlite-backend.js';
import { VectorBackend } from '../memory/vector-backend.js';
import { HybridBackend } from '../memory/hybrid-backend.js';
import { registerMemoryTools } from './tools/memory-tools.js';
import { registerCoordinatorTools } from './tools/coordinator-tools.js';
import { registerRouterTools } from './tools/router-tools.js';
import { registerLearningTools } from './tools/learning-tools.js';
import { registerBusTools } from './tools/bus-tools.js';

async function main() {
  const server = new McpServer({
    name: 'orchestr8',
    version: '0.1.0',
  });

  // Initialize shared memory backend
  const sqlite = new SQLiteBackend();
  const vector = new VectorBackend();
  const memory = new HybridBackend(sqlite, vector);
  await memory.initialize();

  // Register all tool groups
  registerMemoryTools(server, memory);
  registerCoordinatorTools(server);
  registerRouterTools(server);
  registerLearningTools(server);
  registerBusTools(server);

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('orchestr8 MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
