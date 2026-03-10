import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

export function applyMigrations(db: Database.Database, migrationsDir: string): void {
  db.prepare(
    "CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_ts TEXT NOT NULL)"
  ).run();

  const applied = new Set<string>(
    db.prepare("SELECT id FROM migrations").all().map((row: { id: string }) => row.id)
  );

  const entries = fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  for (const entry of entries) {
    if (applied.has(entry)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, entry), "utf-8");
    db.exec(sql);
    db.prepare("INSERT INTO migrations (id, applied_ts) VALUES (?, ?)").run(
      entry,
      new Date().toISOString()
    );
  }
}
