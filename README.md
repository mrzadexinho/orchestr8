# orchestr8

[![CI](https://github.com/mrzadexinho/orchestr8/actions/workflows/ci.yml/badge.svg)](https://github.com/mrzadexinho/orchestr8/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/orchestr8.svg)](https://www.npmjs.com/package/orchestr8)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Agent coordination for Claude Code — shared memory, smart routing, and learning.

## The Problem

When you spawn multiple agents in Claude Code, they're isolated: no shared state, no smart assignment, no memory between sessions. orchestr8 fixes that with 5 focused modules and 13 MCP tools.

## Quick Start

### As an MCP Server (for Claude Code)

```bash
npx orchestr8
```

Or add it permanently:

```bash
claude mcp add orchestr8 -- npx orchestr8
```

That's it. Claude Code now has access to 13 coordination tools. Memory persists to `~/.orchestr8/memory.db` across sessions.

### As a Library

```bash
npm install orchestr8
```

```typescript
import { HybridBackend, SQLiteBackend, VectorBackend, createMemoryEntry } from 'orchestr8';

const memory = new HybridBackend(
  new SQLiteBackend({ databasePath: './my-project.db' }),
  new VectorBackend()
);
await memory.initialize();

// Store something agents can share
await memory.store(createMemoryEntry({
  key: 'auth-design',
  content: 'Use JWT with refresh tokens, 15min access token TTL',
  namespace: 'project-alpha',
  tags: ['architecture', 'auth'],
}));

// Another agent retrieves it
const design = await memory.retrieve('auth-design', 'project-alpha');

// Or search by tags
const results = await memory.query({
  type: 'tag',
  tags: ['architecture'],
  namespace: 'project-alpha',
});
```

## MCP Tools

### Memory
| Tool | Description |
|------|-------------|
| `memory_store` | Store an entry in a shared namespace |
| `memory_retrieve` | Get an entry by key |
| `memory_search` | Search by prefix, tags, or semantic similarity |
| `memory_delete` | Delete an entry |

### Coordinator
| Tool | Description |
|------|-------------|
| `analyze_task` | Score task complexity, decompose into subtasks |
| `score_agents` | Rank agents by capability, load, performance, health, availability |
| `create_delegation_plan` | Full delegation: analyze + score + assign + pick strategy |

### Router
| Tool | Description |
|------|-------------|
| `route_task` | Match task to best agent type with confidence score |
| `record_outcome` | Record success/failure to improve future routing |

### Learning
| Tool | Description |
|------|-------------|
| `store_pattern` | Save a learned pattern from successful work |
| `search_patterns` | Find relevant patterns by similarity |
| `consolidate_patterns` | Promote, prune, and deduplicate patterns |

### Message Bus
| Tool | Description |
|------|-------------|
| `publish_message` | Send a message between agents |
| `get_messages` | Read recent messages with optional filters |

## Architecture

```
orchestr8/
├── memory/          # Dual-write: SQLite (structured) + Vector (semantic)
├── coordinator/     # Task analysis → Agent scoring → Delegation planning
├── router/          # Pattern matching + historical success tracking
├── learning/        # Pattern store with promotion lifecycle
├── message-bus/     # Priority deque pub/sub
└── mcp/             # Thin MCP server layer exposing all above
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| **Dual-write memory** | Every write goes to both SQLite and vector store — query structured or semantic |
| **Namespace isolation** | Agents coordinate through shared namespaces, private state stays private |
| **6-dimension scoring** | Agents scored on capability, load, performance, health, availability — deterministic and tunable |
| **Strategy selection** | Auto-picks sequential/parallel/pipeline/fan-out based on task structure |
| **Pattern promotion** | Short-term patterns that prove useful get promoted to long-term storage |
| **Priority deques** | O(1) message enqueue/dequeue with 4 urgency levels |
| **sql.js (WASM)** | Pure JavaScript SQLite — no native compilation, works everywhere Node runs |

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `ORCHESTR8_DATA_DIR` | `~/.orchestr8` | Directory for persistent data |

## Testing

```bash
npm test              # 90 tests across 13 suites
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Development

```bash
git clone https://github.com/mrzadexinho/orchestr8.git
cd orchestr8
npm install
npm run build
npm test
```

## License

MIT — [Idris Idriszade](https://github.com/mrzadexinho)
