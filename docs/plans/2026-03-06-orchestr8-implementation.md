# orchestr8 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a composable agent coordination library + MCP server for Claude Code — shared memory, smart routing, pattern learning, task coordination, and async messaging.

**Architecture:** 5 independent core modules (memory, coordinator, router, learning, message-bus) with a thin MCP server layer that exposes them as tools. Each module has its own types, implementation, and tests. Zero cross-module dependencies where possible — modules communicate through interfaces, not concrete classes.

**Tech Stack:** TypeScript 5.x, Vitest for testing, @modelcontextprotocol/sdk for MCP server, better-sqlite3 for structured storage, ESM modules.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "orchestr8",
  "version": "0.1.0",
  "description": "Agent coordination for Claude Code — shared memory, smart routing, and learning.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "orchestr8": "./dist/mcp/server.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "dev": "tsc --watch",
    "mcp": "node dist/mcp/server.js"
  },
  "keywords": ["claude-code", "mcp", "agent-orchestration", "multi-agent", "shared-memory"],
  "author": "Idris Idriszade",
  "license": "MIT",
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/mcp/**']
    }
  }
});
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
*.db
*.sqlite
.env
coverage/
.DS_Store
```

**Step 5: Create src/index.ts (empty barrel export)**

```typescript
// orchestr8 — Agent coordination for Claude Code
// Shared memory, smart routing, and learning.

export * from './memory/index.js';
export * from './coordinator/index.js';
export * from './router/index.js';
export * from './learning/index.js';
export * from './message-bus/index.js';
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: Clean install, lock file created

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold orchestr8 project"
```

---

## Task 2: Memory Module — Types

**Files:**
- Create: `src/memory/types.ts`

**Step 1: Write memory types**

```typescript
export interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  embedding?: number[];
  type: MemoryType;
  namespace: string;
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  accessCount: number;
  createdAt: number;
  updatedAt: number;
}

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working' | 'cache';

export interface MemoryEntryInput {
  key: string;
  content: string;
  embedding?: number[];
  type?: MemoryType;
  namespace?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  type: QueryType;
  namespace?: string;
  key?: string;
  keyPrefix?: string;
  tags?: string[];
  content?: string;
  embedding?: number[];
  limit?: number;
  offset?: number;
  threshold?: number;
}

export type QueryType = 'exact' | 'prefix' | 'tag' | 'semantic' | 'hybrid';

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
  source: 'structured' | 'vector' | 'hybrid';
}

export interface IMemoryBackend {
  initialize(): Promise<void>;
  store(entry: MemoryEntry): Promise<void>;
  retrieve(key: string, namespace?: string): Promise<MemoryEntry | undefined>;
  query(query: MemoryQuery): Promise<SearchResult[]>;
  update(id: string, updates: Partial<MemoryEntryInput>): Promise<void>;
  delete(id: string): Promise<void>;
  close(): Promise<void>;
}

export function createMemoryEntry(input: MemoryEntryInput): MemoryEntry {
  const now = Date.now();
  return {
    id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    key: input.key,
    content: input.content,
    embedding: input.embedding,
    type: input.type ?? 'working',
    namespace: input.namespace ?? 'default',
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    version: 1,
    accessCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
```

**Step 2: Commit**

```bash
git add src/memory/types.ts
git commit -m "feat(memory): add memory entry types and interfaces"
```

---

## Task 3: Memory Module — SQLite Backend

**Files:**
- Create: `src/memory/sqlite-backend.ts`
- Create: `tests/memory/sqlite-backend.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteBackend } from '../../src/memory/sqlite-backend.js';
import { createMemoryEntry } from '../../src/memory/types.js';

describe('SQLiteBackend', () => {
  let backend: SQLiteBackend;

  beforeEach(async () => {
    backend = new SQLiteBackend({ databasePath: ':memory:' });
    await backend.initialize();
  });

  afterEach(async () => {
    await backend.close();
  });

  it('should store and retrieve by key', async () => {
    const entry = createMemoryEntry({ key: 'test-key', content: 'test content' });
    await backend.store(entry);
    const result = await backend.retrieve('test-key');
    expect(result).toBeDefined();
    expect(result!.content).toBe('test content');
  });

  it('should retrieve by key and namespace', async () => {
    const entry = createMemoryEntry({ key: 'k1', content: 'ns content', namespace: 'custom' });
    await backend.store(entry);
    expect(await backend.retrieve('k1', 'custom')).toBeDefined();
    expect(await backend.retrieve('k1', 'other')).toBeUndefined();
  });

  it('should query by prefix', async () => {
    await backend.store(createMemoryEntry({ key: 'auth-login', content: 'a' }));
    await backend.store(createMemoryEntry({ key: 'auth-signup', content: 'b' }));
    await backend.store(createMemoryEntry({ key: 'user-profile', content: 'c' }));
    const results = await backend.query({ type: 'prefix', keyPrefix: 'auth-' });
    expect(results).toHaveLength(2);
  });

  it('should query by tags', async () => {
    await backend.store(createMemoryEntry({ key: 'k1', content: 'a', tags: ['security', 'auth'] }));
    await backend.store(createMemoryEntry({ key: 'k2', content: 'b', tags: ['testing'] }));
    const results = await backend.query({ type: 'tag', tags: ['security'] });
    expect(results).toHaveLength(1);
    expect(results[0].entry.key).toBe('k1');
  });

  it('should update an entry', async () => {
    const entry = createMemoryEntry({ key: 'k1', content: 'old' });
    await backend.store(entry);
    await backend.update(entry.id, { content: 'new' });
    const result = await backend.retrieve('k1');
    expect(result!.content).toBe('new');
    expect(result!.version).toBe(2);
  });

  it('should delete an entry', async () => {
    const entry = createMemoryEntry({ key: 'k1', content: 'delete me' });
    await backend.store(entry);
    await backend.delete(entry.id);
    expect(await backend.retrieve('k1')).toBeUndefined();
  });

  it('should respect namespace isolation', async () => {
    await backend.store(createMemoryEntry({ key: 'k1', content: 'a', namespace: 'ns1' }));
    await backend.store(createMemoryEntry({ key: 'k1', content: 'b', namespace: 'ns2' }));
    const results = await backend.query({ type: 'exact', key: 'k1', namespace: 'ns1' });
    expect(results).toHaveLength(1);
    expect(results[0].entry.content).toBe('a');
  });

  it('should increment access count on retrieve', async () => {
    const entry = createMemoryEntry({ key: 'k1', content: 'a' });
    await backend.store(entry);
    await backend.retrieve('k1');
    await backend.retrieve('k1');
    const result = await backend.retrieve('k1');
    expect(result!.accessCount).toBe(3);
  });

  it('should support limit and offset', async () => {
    for (let i = 0; i < 10; i++) {
      await backend.store(createMemoryEntry({ key: `k${i}`, content: `content ${i}` }));
    }
    const results = await backend.query({ type: 'prefix', keyPrefix: 'k', limit: 3, offset: 2 });
    expect(results).toHaveLength(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/memory/sqlite-backend.test.ts`
Expected: FAIL — module not found

**Step 3: Implement SQLiteBackend**

Implement `src/memory/sqlite-backend.ts` — a class implementing `IMemoryBackend` using better-sqlite3. Store entries as rows with JSON columns for tags/metadata. Support exact, prefix, tag queries via SQL. Increment accessCount on retrieve.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/memory/sqlite-backend.test.ts`
Expected: All 9 tests PASS

**Step 5: Commit**

```bash
git add src/memory/sqlite-backend.ts tests/memory/sqlite-backend.test.ts
git commit -m "feat(memory): implement SQLite backend with structured queries"
```

---

## Task 4: Memory Module — Vector Backend (HNSW)

**Files:**
- Create: `src/memory/vector-backend.ts`
- Create: `src/memory/hnsw-index.ts`
- Create: `tests/memory/vector-backend.test.ts`

**Step 1: Write failing tests for vector search**

Tests should cover:
- Store entry with embedding, search by cosine similarity
- Top-k search returns ranked results
- Threshold filtering (only results above threshold)
- Delete removes from vector index
- Empty index returns empty results

**Step 2: Implement HNSW index**

Pure TypeScript HNSW implementation with:
- Config: M=16, efConstruction=200, efSearch=100
- Cosine similarity metric
- Binary max heap for top-k tracking
- O(log n) search performance

**Step 3: Implement VectorBackend**

Wraps HNSW index, implements `IMemoryBackend` for semantic queries.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat(memory): implement HNSW vector backend for semantic search"
```

---

## Task 5: Memory Module — Hybrid Backend (Dual-Write)

**Files:**
- Create: `src/memory/hybrid-backend.ts`
- Create: `tests/memory/hybrid-backend.test.ts`
- Create: `src/memory/index.ts`

**Step 1: Write failing tests**

Tests should cover:
- Dual-write: store writes to both SQLite and vector
- Exact query routes to SQLite
- Semantic query routes to vector
- Hybrid query merges results from both
- Delete removes from both backends
- Retrieve works after dual-write

**Step 2: Implement HybridBackend**

```typescript
// Query routing logic:
// exact/prefix/tag → SQLite
// semantic → Vector
// hybrid → both in parallel, merge by score
```

**Step 3: Create index.ts barrel export**

**Step 4: Run all memory tests**

Run: `npx vitest run tests/memory/`
Expected: All tests PASS

**Step 5: Commit**

```bash
git commit -m "feat(memory): implement hybrid dual-write backend"
```

---

## Task 6: Coordinator Module — Task Analyzer

**Files:**
- Create: `src/coordinator/types.ts`
- Create: `src/coordinator/task-analyzer.ts`
- Create: `tests/coordinator/task-analyzer.test.ts`

**Step 1: Write failing tests**

Tests should cover:
- Simple task gets low complexity (< 0.5)
- Task with subtasks increases complexity
- Task with dependencies increases complexity
- Priority multiplier applied (critical > normal > low)
- Task type weights applied correctly
- Subtask decomposition for coding tasks (design→implement→test)
- Subtask decomposition for testing tasks
- Required capabilities extracted from description keywords
- Estimated duration scales with complexity

**Step 2: Implement types**

```typescript
export interface TaskDefinition {
  id: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  subtasks?: SubTask[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export type TaskType = 'coding' | 'testing' | 'research' | 'coordination' | 'security' | 'review';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface TaskAnalysis {
  taskId: string;
  complexity: number;           // 0-1
  estimatedDurationMs: number;
  requiredCapabilities: string[];
  subtasks: SubTask[];
  confidence: number;           // 0-1
}

export interface SubTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  dependencies: string[];
  estimatedDurationMs: number;
  requiredCapabilities: string[];
}
```

**Step 3: Implement TaskAnalyzer**

Complexity formula: base(0.3) + subtask_weight + dependency_weight * priority_multiplier + type_weight

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat(coordinator): implement task analyzer with complexity scoring"
```

---

## Task 7: Coordinator Module — Agent Scorer

**Files:**
- Create: `src/coordinator/agent-scorer.ts`
- Create: `tests/coordinator/agent-scorer.test.ts`

**Step 1: Write failing tests**

Tests should cover:
- 6-dimension weighted scoring: capability(0.30) + load(0.20) + performance(0.25) + health(0.15) + availability(0.10)
- Idle agents score higher on availability than busy agents
- Agents with matching capabilities score higher
- Less-loaded agents preferred
- Agents sorted by total score descending
- Agent with zero health scores low overall

**Step 2: Implement AgentScorer**

```typescript
export interface AgentState {
  id: string;
  type: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  workload: number;      // 0-1
  successRate: number;    // 0-1
  health: number;         // 0-1
}

export interface AgentScore {
  agentId: string;
  totalScore: number;
  capabilityScore: number;
  loadScore: number;
  performanceScore: number;
  healthScore: number;
  availabilityScore: number;
}
```

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git commit -m "feat(coordinator): implement 6-dimension agent scorer"
```

---

## Task 8: Coordinator Module — Delegator

**Files:**
- Create: `src/coordinator/delegator.ts`
- Create: `tests/coordinator/delegator.test.ts`
- Create: `src/coordinator/index.ts`

**Step 1: Write failing tests**

Tests should cover:
- Creates delegation plan with primary + backup agents
- Selects execution strategy based on task structure
  - 0 subtasks → sequential
  - No deps + 2+ subtasks → parallel
  - Has deps + 3+ subtasks → pipeline
  - Complexity > 0.7 → fan-out-fan-in
- Backup agents have score >= 0.3
- Parallel assignments map subtasks to best agents per domain
- Empty agent list returns error/empty plan

**Step 2: Implement Delegator**

Combines TaskAnalyzer + AgentScorer to produce DelegationPlan.

**Step 3: Create index.ts barrel export**

**Step 4: Run all coordinator tests**

Run: `npx vitest run tests/coordinator/`
Expected: All tests PASS

**Step 5: Commit**

```bash
git commit -m "feat(coordinator): implement delegator with strategy selection"
```

---

## Task 9: Router Module

**Files:**
- Create: `src/router/types.ts`
- Create: `src/router/pattern-matcher.ts`
- Create: `src/router/history-tracker.ts`
- Create: `tests/router/pattern-matcher.test.ts`
- Create: `tests/router/history-tracker.test.ts`
- Create: `src/router/index.ts`

**Step 1: Write failing tests for PatternMatcher**

Tests should cover:
- Security keywords → security-architect (85% confidence)
- Test keywords → test-architect (85%)
- Performance keywords → performance-engineer (85%)
- Architecture keywords → core-architect (85%)
- Unknown keywords → coder (70% default)
- Multiple keyword matches → highest confidence wins
- Returns alternatives ranked by confidence

**Step 2: Implement PatternMatcher**

Regex-based keyword → agent type mapping with confidence scores.

**Step 3: Write failing tests for HistoryTracker**

Tests should cover:
- Record task outcome (agent, task type, success/failure)
- Query success rate for agent + task type combo
- History influences routing confidence boost
- No history → no boost
- Returns taskCount for similar tasks

**Step 4: Implement HistoryTracker**

In-memory store of outcomes with aggregation.

**Step 5: Create index.ts combining both**

**Step 6: Run all router tests**

**Step 7: Commit**

```bash
git commit -m "feat(router): implement pattern matching and history-based routing"
```

---

## Task 10: Learning Module

**Files:**
- Create: `src/learning/types.ts`
- Create: `src/learning/pattern-store.ts`
- Create: `src/learning/lifecycle.ts`
- Create: `tests/learning/pattern-store.test.ts`
- Create: `tests/learning/lifecycle.test.ts`
- Create: `src/learning/index.ts`

**Step 1: Write failing tests for PatternStore**

Tests should cover:
- Store pattern in short-term (capacity 1000)
- Search patterns by content similarity
- Duplicate detection (similarity > 0.95 updates existing)
- Record outcome updates quality score
- Quality = 0.3 + (successCount / usageCount) * 0.7

**Step 2: Implement PatternStore**

Short-term (1K) + long-term (5K) stores with hash-based similarity.

**Step 3: Write failing tests for Lifecycle**

Tests should cover:
- Promote pattern when usageCount >= 3 AND quality >= 0.6
- Prune patterns older than 24h with < 2 uses and low quality
- Consolidate deduplicates similar patterns
- Long-term patterns survive consolidation

**Step 4: Implement Lifecycle**

Store → score → promote → consolidate → prune pipeline.

**Step 5: Create index.ts barrel export**

**Step 6: Run all learning tests**

**Step 7: Commit**

```bash
git commit -m "feat(learning): implement pattern store with promotion lifecycle"
```

---

## Task 11: Message Bus Module

**Files:**
- Create: `src/message-bus/types.ts`
- Create: `src/message-bus/priority-queue.ts`
- Create: `src/message-bus/bus.ts`
- Create: `tests/message-bus/priority-queue.test.ts`
- Create: `tests/message-bus/bus.test.ts`
- Create: `src/message-bus/index.ts`

**Step 1: Write failing tests for PriorityQueue**

Tests should cover:
- Enqueue/dequeue O(1) operations
- Urgent messages dequeue before normal
- 4 priority levels respected in order
- Empty queue returns undefined
- Queue grows dynamically

**Step 2: Implement PriorityQueue with Deque**

Circular buffer deque per priority level.

**Step 3: Write failing tests for MessageBus**

Tests should cover:
- Subscribe agent, publish message, callback invoked
- Broadcast reaches all subscribers
- Direct message reaches only target
- Priority ordering in delivery
- Unsubscribe stops delivery

**Step 4: Implement MessageBus**

Subscription map + priority queue + processing loop.

**Step 5: Create index.ts barrel export**

**Step 6: Run all message-bus tests**

**Step 7: Commit**

```bash
git commit -m "feat(message-bus): implement priority queue and pub/sub bus"
```

---

## Task 12: MCP Server

**Files:**
- Create: `src/mcp/server.ts`
- Create: `src/mcp/tools/memory-tools.ts`
- Create: `src/mcp/tools/coordinator-tools.ts`
- Create: `src/mcp/tools/router-tools.ts`
- Create: `src/mcp/tools/learning-tools.ts`
- Create: `src/mcp/tools/bus-tools.ts`

**Step 1: Implement MCP server entry point**

Stdio transport, registers all tools from core modules.

**Step 2: Implement memory-tools**

Tools: `memory_store`, `memory_retrieve`, `memory_search`, `memory_delete`

**Step 3: Implement coordinator-tools**

Tools: `analyze_task`, `score_agents`, `create_delegation_plan`

**Step 4: Implement router-tools**

Tools: `route_task`, `record_outcome`

**Step 5: Implement learning-tools**

Tools: `store_pattern`, `search_patterns`, `consolidate_patterns`

**Step 6: Implement bus-tools**

Tools: `publish_message`, `get_messages`

**Step 7: Build and test manually**

Run: `npm run build && echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}},"id":1}' | node dist/mcp/server.js`
Expected: JSON response with server capabilities

**Step 8: Commit**

```bash
git commit -m "feat(mcp): implement MCP server with all tool definitions"
```

---

## Task 13: README + Examples

**Files:**
- Create: `README.md`
- Create: `examples/basic-memory.ts`
- Create: `examples/task-routing.ts`
- Create: `examples/claude-code-setup.md`

**Step 1: Write README**

Sections: What it does (one-liner), Install, Quick Start (MCP setup for Claude Code), Library Usage, API Reference (per module), Architecture, Benchmarks, License.

No badges. No marketing. Clean and direct.

**Step 2: Write basic-memory example**

Show: create hybrid backend, store entries in namespace, query structured + semantic.

**Step 3: Write task-routing example**

Show: route a task, get agent recommendation, record outcome, see improved routing.

**Step 4: Write Claude Code setup guide**

Show: `claude mcp add orchestr8 -- npx orchestr8`, then using tools in conversation.

**Step 5: Commit**

```bash
git commit -m "docs: add README, examples, and Claude Code setup guide"
```

---

## Task 14: GitHub Repo + Initial Push

**Step 1: Create GitHub repo**

Run: `gh repo create orchestr8 --public --description "Agent coordination for Claude Code — shared memory, smart routing, and learning." --source . --push`

**Step 2: Verify repo is live**

Run: `gh repo view orchestr8`

---

## Summary

| Task | Module | What |
|------|--------|------|
| 1 | Project | Scaffolding, deps, config |
| 2 | Memory | Types and interfaces |
| 3 | Memory | SQLite backend (structured queries) |
| 4 | Memory | HNSW vector backend (semantic search) |
| 5 | Memory | Hybrid dual-write backend |
| 6 | Coordinator | Task analyzer (complexity scoring) |
| 7 | Coordinator | Agent scorer (6-dimension weighted) |
| 8 | Coordinator | Delegator (strategy selection) |
| 9 | Router | Pattern matcher + history tracker |
| 10 | Learning | Pattern store + promotion lifecycle |
| 11 | Message Bus | Priority queue + pub/sub |
| 12 | MCP | Server + all tool definitions |
| 13 | Docs | README, examples, setup guide |
| 14 | Deploy | GitHub repo creation + push |
