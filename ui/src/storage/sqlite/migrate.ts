// /src/storage/sqlite/migrate.ts

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { SqliteDb } from "./db.js";

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex");
}

async function applyHashedMigration(db: SqliteDb, idPrefix: string, sql: string): Promise<void> {
  const migrationId = `${idPrefix}:${sha1(sql)}`;

  const existing = await db.get<{ id: string }>(
    "SELECT id FROM migrations WHERE id = ?",
    migrationId
  );

  if (existing?.id) return;

  await db.exec(sql);
  await db.run(
    "INSERT INTO migrations (id, applied_at) VALUES (?, ?)",
    migrationId,
    new Date().toISOString()
  );
}

export async function applyMigrations(db: SqliteDb): Promise<void> {
  // Ensure migrations table exists before anything else.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  // 1) Base local schema
  const baseSchemaPath = path.join(process.cwd(), "src", "storage", "sqlite", "schema.sql");
  const baseSchemaSql = fs.readFileSync(baseSchemaPath, "utf8");
  await applyHashedMigration(db, "schema", baseSchemaSql);

  // 2) AEGIS schema (tensors/markers/peer-session posture)
  const aegisSchemaPath = path.join(process.cwd(), "src", "storage", "sqlite", "aegisSchema.sql");
  const aegisSchemaSql = fs.readFileSync(aegisSchemaPath, "utf8");
  await applyHashedMigration(db, "aegisSchema", aegisSchemaSql);
}
