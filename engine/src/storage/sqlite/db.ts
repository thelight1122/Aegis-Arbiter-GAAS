import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { applyMigrations } from "./migrations";

export function openDatabase(rootDir: string): Database.Database {
  const dbPath = path.join(rootDir, "data", "aegis-codex.sqlite");
  return openDatabaseAtPath(dbPath, path.join(rootDir, "engine", "migrations"));
}

export function openDatabaseAtPath(dbPath: string, migrationsDir: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  applyMigrations(db, migrationsDir);
  return db;
}
