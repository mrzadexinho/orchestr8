#!/usr/bin/env node

import * as path from 'node:path';
import * as os from 'node:os';
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

function getDataDir(): string {
  const envDir = process.env['ORCHESTR8_DATA_DIR'];
  if (envDir) return envDir;
  return path.join(os.homedir(), '.orchestr8');
}

async function main() {
  const server = new McpServer({
    name: 'orchestr8',
    version: '0.1.0',
  });

  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'memory.db');

  // Initialize persistent shared memory backend
  const sqlite = new SQLiteBackend({ databasePath: dbPath });
  const vector = new VectorBackend();
  const memory = new HybridBackend(sqlite, vector);
  await memory.initialize();

  // Register all tool groups
  registerMemoryTools(server, memory);
  registerCoordinatorTools(server);
  registerRouterTools(server);
  registerLearningTools(server);
  registerBusTools(server);

  // Graceful shutdown — persist data
  process.on('SIGINT', async () => {
    await memory.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await memory.close();
    process.exit(0);
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`orchestr8 MCP server running (data: ${dataDir})`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
