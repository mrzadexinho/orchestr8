import initSqlJs, { type Database } from 'sql.js';
import type { IMemoryBackend, MemoryEntry, MemoryEntryInput, MemoryQuery, SearchResult } from './types.js';

export class SQLiteBackend implements IMemoryBackend {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database();

    this.db.run(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        type TEXT NOT NULL,
        namespace TEXT NOT NULL,
        tags TEXT NOT NULL,
        metadata TEXT NOT NULL,
        version INTEGER NOT NULL,
        access_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_key_namespace ON memory (key, namespace)`);
  }

  private getDb(): Database {
    if (!this.db) throw new Error('SQLiteBackend not initialized');
    return this.db;
  }

  async store(entry: MemoryEntry): Promise<void> {
    const db = this.getDb();
    db.run(
      `INSERT INTO memory (id, key, content, embedding, type, namespace, tags, metadata, version, access_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.key,
        entry.content,
        entry.embedding ? JSON.stringify(entry.embedding) : null,
        entry.type,
        entry.namespace,
        JSON.stringify(entry.tags),
        JSON.stringify(entry.metadata),
        entry.version,
        entry.accessCount,
        entry.createdAt,
        entry.updatedAt,
      ]
    );
  }

  async retrieve(key: string, namespace: string = 'default'): Promise<MemoryEntry | undefined> {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM memory WHERE key = ? AND namespace = ? LIMIT 1');
    stmt.bind([key, namespace]);

    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }

    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();

    // Increment access count
    db.run('UPDATE memory SET access_count = access_count + 1 WHERE id = ?', [row['id'] as string]);

    return this.rowToEntry(row);
  }

  async query(query: MemoryQuery): Promise<SearchResult[]> {
    const db = this.getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.namespace) {
      conditions.push('namespace = ?');
      params.push(query.namespace);
    }

    switch (query.type) {
      case 'exact':
        if (query.key) {
          conditions.push('key = ?');
          params.push(query.key);
        }
        break;
      case 'prefix':
        if (query.keyPrefix) {
          conditions.push('key LIKE ?');
          params.push(`${query.keyPrefix}%`);
        }
        break;
      case 'tag':
        if (query.tags && query.tags.length > 0) {
          for (const tag of query.tags) {
            conditions.push('tags LIKE ?');
            params.push(`%"${tag}"%`);
          }
        }
        break;
      default:
        break;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ? `LIMIT ${query.limit}` : '';
    const offset = query.offset ? `OFFSET ${query.offset}` : '';

    const sql = `SELECT * FROM memory ${where} ORDER BY updated_at DESC ${limit} ${offset}`;
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params as (string | number | null)[]);
    }

    const results: SearchResult[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        entry: this.rowToEntry(row),
        score: 1.0,
        source: 'structured',
      });
    }
    stmt.free();

    return results;
  }

  async update(id: string, updates: Partial<MemoryEntryInput>): Promise<void> {
    const db = this.getDb();
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.key !== undefined) {
      setClauses.push('key = ?');
      params.push(updates.key);
    }
    if (updates.content !== undefined) {
      setClauses.push('content = ?');
      params.push(updates.content);
    }
    if (updates.embedding !== undefined) {
      setClauses.push('embedding = ?');
      params.push(JSON.stringify(updates.embedding));
    }
    if (updates.type !== undefined) {
      setClauses.push('type = ?');
      params.push(updates.type);
    }
    if (updates.namespace !== undefined) {
      setClauses.push('namespace = ?');
      params.push(updates.namespace);
    }
    if (updates.tags !== undefined) {
      setClauses.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    setClauses.push('version = version + 1');
    setClauses.push('updated_at = ?');
    params.push(Date.now());

    params.push(id);

    db.run(`UPDATE memory SET ${setClauses.join(', ')} WHERE id = ?`, params as (string | number | null)[]);
  }

  async delete(id: string): Promise<void> {
    const db = this.getDb();
    db.run('DELETE FROM memory WHERE id = ?', [id]);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private rowToEntry(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row['id'] as string,
      key: row['key'] as string,
      content: row['content'] as string,
      embedding: row['embedding'] ? JSON.parse(row['embedding'] as string) : undefined,
      type: row['type'] as MemoryEntry['type'],
      namespace: row['namespace'] as string,
      tags: JSON.parse(row['tags'] as string),
      metadata: JSON.parse(row['metadata'] as string),
      version: row['version'] as number,
      accessCount: row['access_count'] as number,
      createdAt: row['created_at'] as number,
      updatedAt: row['updated_at'] as number,
    };
  }
}
