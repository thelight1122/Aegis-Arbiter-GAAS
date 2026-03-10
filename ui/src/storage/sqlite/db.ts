// /src/storage/sqlite/db.ts

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";

export type SqliteDb = NodeSqliteDb;

class NodeSqliteDb {
  public readonly db: DatabaseSync;

  constructor(filename: string) {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(filename);

    // Pragmas for sane local behavior
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, ...params: SQLInputValue[]): Promise<void> {
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  async get<T>(sql: string, ...params: SQLInputValue[]): Promise<T | undefined> {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as T | undefined;
    return row;
  }

  async all<T>(sql: string, ...params: SQLInputValue[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as T[] | undefined;
    return rows ?? [];
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export async function openDb(): Promise<SqliteDb> {
  // Stable location for local POC db
  const dbPath = path.join(process.cwd(), "data", "aegis-local.sqlite");
  return new NodeSqliteDb(dbPath);
}
