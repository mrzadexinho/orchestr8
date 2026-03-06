# orchestr8

Agent coordination for Claude Code — shared memory, smart routing, and learning.

## What It Does

When you spawn multiple agents in Claude Code, they're isolated: no shared state, no smart assignment, no memory between sessions. orchestr8 fixes that.

- **Shared Memory** — Agents read/write to namespaced memory (SQLite for structured queries + vector search for semantic)
- **Smart Routing** — Tasks get matched to the best agent type based on keywords and historical success rates
- **Coordination** — Task complexity analysis, 6-dimension agent scoring, automatic delegation planning
- **Learning** — Patterns from successful tasks are stored, scored, promoted, and reused
- **Message Bus** — Priority-based async messaging between agents

## Quick Start

### As an MCP Server (for Claude Code)

```bash
# Add to Claude Code
claude mcp add orchestr8 -- npx orchestr8
```

That's it. Claude Code now has access to 13 coordination tools.

### As a Library

```bash
npm install orchestr8
```

```typescript
import { HybridBackend, SQLiteBackend, VectorBackend, createMemoryEntry } from 'orchestr8';

// Set up shared memory
const memory = new HybridBackend(new SQLiteBackend(), new VectorBackend());
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

// Or search semantically
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

### Design Principles

- **5 modules, 5 problems** — each module exists because it solves a specific coordination gap
- **No stubs** — everything in the repo works and has tests
- **Composable** — use the MCP server or import individual modules
- **No bloat** — no plugin systems, no topology managers, no consensus engines

### Key Patterns

| Pattern | What It Does |
|---------|-------------|
| **Dual-write memory** | Every write goes to both SQLite and vector store — query structured or semantic |
| **Namespace isolation** | Agents coordinate through shared namespaces, private state stays private |
| **6-dimension scoring** | Agents scored on capability, load, performance, health, availability — deterministic and tunable |
| **Strategy selection** | Auto-picks sequential/parallel/pipeline/fan-out based on task structure |
| **Pattern promotion** | Short-term patterns that prove useful get promoted to long-term storage |
| **Priority deques** | O(1) message enqueue/dequeue with 4 urgency levels |

## Testing

```bash
npm test          # Run all 90 tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Development

```bash
npm install
npm run build     # TypeScript compilation
npm run dev       # Watch mode compilation
npm test          # Vitest
```

## License

MIT
