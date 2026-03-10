// /src/settings/storageSettings.ts

import type { SqliteDb } from "../storage/sqlite/db.js";
import crypto from "crypto";

export type StorageMode = "minimal" | "standard" | "verbose";

export interface StorageSettings {
  mode: StorageMode;
  auditPublicEnabled: boolean;
  auditPrivateEnabled: boolean;     // only active when debug unlocked
  retainDays: number;              // auto-purge horizon
  storeFullTranscripts: boolean;   // OFF by default
}

const DEFAULT_SETTINGS: StorageSettings = {
  mode: "minimal",
  auditPublicEnabled: true,
  auditPrivateEnabled: false,
  retainDays: 7,
  storeFullTranscripts: false,
};

const SETTINGS_KEY = "storage";

export async function ensureSession(db: SqliteDb, sessionId?: string): Promise<string> {
  const id = sessionId ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const existing = await db.get<{ id: string }>(
    "SELECT id FROM sessions WHERE id = ?",
    id
  );

  if (!existing?.id) {
    await db.run(
      "INSERT INTO sessions (id, created_at, last_seen_at, debug_unlocked) VALUES (?, ?, ?, 0)",
      id,
      now,
      now
    );
  } else {
    await db.run("UPDATE sessions SET last_seen_at = ? WHERE id = ?", now, id);
  }

  // Ensure settings exist
  await ensureSettings(db);

  return id;
}

export async function ensureSettings(db: SqliteDb): Promise<void> {
  const existing = await db.get<{ setting_key: string }>(
    "SELECT setting_key FROM settings WHERE setting_key = ?",
    SETTINGS_KEY
  );

  if (!existing?.setting_key) {
    await db.run(
      "INSERT INTO settings (setting_key, value_json, updated_at) VALUES (?, ?, ?)",
      SETTINGS_KEY,
      JSON.stringify(DEFAULT_SETTINGS),
      new Date().toISOString()
    );
  }
}

export async function getStorageSettings(db: SqliteDb): Promise<StorageSettings> {
  const row = await db.get<{ value_json: string }>(
    "SELECT value_json FROM settings WHERE setting_key = ?",
    SETTINGS_KEY
  );

  if (!row?.value_json) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(row.value_json);
    return { ...DEFAULT_SETTINGS, ...parsed } as StorageSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setStorageMode(db: SqliteDb, mode: StorageMode): Promise<StorageSettings> {
  const current = await getStorageSettings(db);

  const next: StorageSettings =
    mode === "minimal"
      ? { ...current, mode, auditPublicEnabled: true, storeFullTranscripts: false, retainDays: Math.max(3, current.retainDays) }
      : mode === "standard"
      ? { ...current, mode, auditPublicEnabled: true, storeFullTranscripts: false, retainDays: Math.max(7, current.retainDays) }
      : { ...current, mode, auditPublicEnabled: true, storeFullTranscripts: current.storeFullTranscripts, retainDays: Math.max(14, current.retainDays) };

  await db.run(
    "UPDATE settings SET value_json = ?, updated_at = ? WHERE setting_key = ?",
    JSON.stringify(next),
    new Date().toISOString(),
    SETTINGS_KEY
  );

  return next;
}

export async function setDebugUnlocked(db: SqliteDb, sessionId: string, unlocked: boolean): Promise<void> {
  await db.run(
    "UPDATE sessions SET debug_unlocked = ? WHERE id = ?",
    unlocked ? 1 : 0,
    sessionId
  );

  const current = await getStorageSettings(db);
  const next = { ...current, auditPrivateEnabled: unlocked };

  await db.run(
    "UPDATE settings SET value_json = ?, updated_at = ? WHERE setting_key = ?",
    JSON.stringify(next),
    new Date().toISOString(),
    SETTINGS_KEY
  );
}

export async function isDebugUnlocked(db: SqliteDb, sessionId: string): Promise<boolean> {
  const row = await db.get<{ debug_unlocked: number }>(
    "SELECT debug_unlocked FROM sessions WHERE id = ?",
    sessionId
  );
  return !!row?.debug_unlocked;
}
