// /src/sovereign/commands/handleSovereignCommand.ts

import type { SqliteDb } from "../../storage/sqlite/db.js";
import { AuditLogger } from "../../audit/auditLogger.js";
import { Bookcase } from "../../bookcase/bookcase.js";
import type { SovereignCommand } from "./parseSovereignCommand.js";
import {
  getStorageSettings,
  setStorageMode,
  setDebugUnlocked,
  isDebugUnlocked,
} from "../../settings/storageSettings.js";

export interface SovereignResponse {
  ok: boolean;
  message: string;
  payload?: Record<string, unknown>;
}

// Minimal, defensive access to a native node:sqlite DatabaseSync handle.
// Per SSSP, SqliteDb exposes native handle at db.db, but we keep this resilient.
function getNativeHandle(db: SqliteDb): any | null {
  const anyDb = db as any;
  const native = anyDb?.db ?? anyDb?.nativeDb ?? anyDb?.native;
  if (!native) return null;
  if (typeof native.prepare === "function") return native;
  return native;
}

type SqlRow = Record<string, unknown>;

function nativeGet(native: any, sql: string, params: unknown[] = []): SqlRow | null {
  if (!native || typeof native.prepare !== "function") return null;
  const stmt = native.prepare(sql);
  const row = stmt.get(...params);
  return (row as SqlRow) ?? null;
}

function nativeAll(native: any, sql: string, params: unknown[] = []): SqlRow[] {
  if (!native || typeof native.prepare !== "function") return [];
  const stmt = native.prepare(sql);
  const rows = stmt.all(...params);
  return (Array.isArray(rows) ? (rows as SqlRow[]) : []) ?? [];
}

function hasTable(native: any, tableName: string): boolean {
  const row = nativeGet(
    native,
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  );
  return !!row?.name;
}

function safeIso(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type AegisScope = { scopeType: "org" | "user"; scopeId: string };

function chooseScope(aegisSession: SqlRow | null): AegisScope | null {
  if (!aegisSession) return null;
  const orgId = (aegisSession as any).org_id as string | undefined;
  const userId = (aegisSession as any).user_id as string | undefined;

  // Prefer user scope first (more specific), then org scope.
  if (userId) return { scopeType: "user", scopeId: userId };
  if (orgId) return { scopeType: "org", scopeId: orgId };
  return null;
}

export async function handleSovereignCommand(args: {
  db: SqliteDb;
  audit: AuditLogger;
  bookcase: Bookcase;
  sessionId: string;
  cmd: SovereignCommand;
}): Promise<SovereignResponse> {
  const { db, audit, bookcase, sessionId, cmd } = args;

  // Always log command execution (PUBLIC).
  await audit.write({
    sessionId,
    channel: "PUBLIC",
    eventType: "CONTROL_COMMAND",
    severity: 0,
    axiomTags: ["SOVEREIGNTY", "TRANSPARENCY", "AGENCY"],
    reasonCodes: ["CONTROL_COMMAND_EXECUTED"],
    summary: `Command executed: ${cmd.kind}`,
    details: { cmd },
  });

  switch (cmd.kind) {
    case "HELP":
      return {
        ok: true,
        message:
          "Commands: /aegis help | /aegis status | /aegis audit --limit=50 --since=ISO | /aegis bookcase list | /aegis bookcase shelve \"label\" \"content\" --unshelve=\"cond\" | /aegis bookcase unshelve <id> | /aegis storage status | /aegis storage set minimal|standard|verbose | /aegis debug unlock --confirm=YES | /aegis debug lock | /aegis export | /aegis purge --scope=session|all --confirm=YES",
      };

    case "AEGIS_STATUS": {
      const native = getNativeHandle(db);

      if (!native) {
        return {
          ok: false,
          message:
            "Status unavailable: native SQLite handle not found on SqliteDb (expected db.db).",
        };
      }

      const hasBaseSessions = hasTable(native, "sessions");
      const hasAegisSessions = hasTable(native, "aegis_sessions");
      const hasMarkerEvents = hasTable(native, "aegis_marker_events");
      const hasCandidates = hasTable(native, "aegis_marker_candidates");
      const hasLearned = hasTable(native, "aegis_learned_markers");
      const hasCatalog = hasTable(native, "aegis_marker_catalog");

      if (!hasAegisSessions) {
        return {
          ok: false,
          message:
            "AEGIS tables not present (aegis_sessions missing). Apply migrations / run local bootstrap.",
          payload: {
            visibility: {
              tables: {
                sessions: hasBaseSessions,
                aegis_sessions: hasAegisSessions,
                aegis_marker_events: hasMarkerEvents,
                aegis_marker_candidates: hasCandidates,
                aegis_learned_markers: hasLearned,
                aegis_marker_catalog: hasCatalog,
              },
            },
          },
        };
      }

      // Base session row (if present). We don’t assume columns.
      const baseSession = hasBaseSessions
        ? nativeGet(native, "SELECT * FROM sessions WHERE id = ?", [sessionId])
        : null;

      // AEGIS session row (schema-aligned fields).
      const aegisSession = nativeGet(
        native,
        `SELECT id, org_id, user_id, status, started_at, ended_at, integrity_resonance, peer_state
         FROM aegis_sessions
         WHERE id = ?`,
        [sessionId]
      );

      if (!aegisSession) {
        return {
          ok: false,
          message:
            "AEGIS session row not found. Seed/bootstrap may not have mirrored sessions into aegis_sessions yet.",
          payload: {
            sessionId,
            baseSession,
            visibility: {
              tables: {
                sessions: hasBaseSessions,
                aegis_sessions: hasAegisSessions,
                aegis_marker_events: hasMarkerEvents,
                aegis_marker_candidates: hasCandidates,
                aegis_learned_markers: hasLearned,
                aegis_marker_catalog: hasCatalog,
              },
            },
          },
        };
      }

      const scope = chooseScope(aegisSession);

      const orgId = (aegisSession as any).org_id as string | undefined;
      const userId = (aegisSession as any).user_id as string | undefined;

      const limitEvents = 10;
      const limitCandidates = 20;
      const limitLearned = 20;

      // Marker events: prefer session-specific (strong “time in this run”), then fall back to scope.
      const markerEvents =
        hasMarkerEvents && orgId
          ? nativeAll(
              native,
              `SELECT id, event_type, scope_type, scope_id, marker_id, detail, created_at, session_id, user_id, org_id
               FROM aegis_marker_events
               WHERE org_id = ?
                 AND (session_id = ? OR (scope_type = ? AND scope_id = ?))
               ORDER BY created_at DESC, id DESC
               LIMIT ?`,
              [orgId, sessionId, scope?.scopeType ?? "org", scope?.scopeId ?? orgId, limitEvents]
            )
          : [];

      // Candidates / learned are stored per scope, not per session.
      const candidates =
        hasCandidates && scope
          ? nativeAll(
              native,
              `SELECT id, scope_type, scope_id, marker_id, status,
                      total_count, spaced_count, first_seen_at, last_seen_at, last_session_id,
                      evidence_refs, created_at, updated_at
               FROM aegis_marker_candidates
               WHERE scope_type = ? AND scope_id = ?
               ORDER BY last_seen_at DESC, id DESC
               LIMIT ?`,
              [scope.scopeType, scope.scopeId, limitCandidates]
            )
          : [];

      const learned =
        hasLearned && scope
          ? nativeAll(
              native,
              hasCatalog
                ? `SELECT lm.id, lm.scope_type, lm.scope_id, lm.marker_id,
                         lm.strength, lm.locked, lm.total_count, lm.spaced_count,
                         lm.first_learned_at, lm.last_seen_at, lm.last_session_id,
                         lm.evidence_refs, lm.created_at, lm.updated_at,
                         mc.title as marker_title, mc.category as marker_category
                   FROM aegis_learned_markers lm
                   LEFT JOIN aegis_marker_catalog mc ON mc.id = lm.marker_id
                   WHERE lm.scope_type = ? AND lm.scope_id = ?
                   ORDER BY lm.last_seen_at DESC, lm.id DESC
                   LIMIT ?`
                : `SELECT id, scope_type, scope_id, marker_id, strength, locked,
                         total_count, spaced_count, first_learned_at, last_seen_at, last_session_id,
                         evidence_refs, created_at, updated_at
                   FROM aegis_learned_markers
                   WHERE scope_type = ? AND scope_id = ?
                   ORDER BY last_seen_at DESC, id DESC
                   LIMIT ?`,
              [scope.scopeType, scope.scopeId, limitLearned]
            )
          : [];

      const msgParts: string[] = [];
      msgParts.push("AEGIS status loaded.");
      msgParts.push(`sessionId=${sessionId}`);

      const baseStatus = baseSession ? (baseSession as any).status : undefined;
      if (typeof baseStatus !== "undefined") {
        msgParts.push(`sessions.status=${String(baseStatus)}`);
      }

      msgParts.push(`aegis_sessions.status=${String((aegisSession as any).status)}`);
      msgParts.push(`integrity_resonance=${String((aegisSession as any).integrity_resonance)}`);

      if (orgId) msgParts.push(`orgId=${orgId}`);
      if (userId) msgParts.push(`userId=${userId}`);
      if (scope) msgParts.push(`scope=${scope.scopeType}:${scope.scopeId}`);

      msgParts.push(
        `events=${markerEvents.length}, candidates=${candidates.length}, learned=${learned.length}`
      );

      return {
        ok: true,
        message: msgParts.join(" | "),
        payload: {
          session: {
            sessionId,
            base: baseSession,
            aegis: {
              ...aegisSession,
              started_at: safeIso((aegisSession as any).started_at) ?? (aegisSession as any).started_at,
              ended_at: safeIso((aegisSession as any).ended_at) ?? (aegisSession as any).ended_at,
            },
            scope,
          },
          visibility: {
            tables: {
              sessions: hasBaseSessions,
              aegis_sessions: hasAegisSessions,
              aegis_marker_events: hasMarkerEvents,
              aegis_marker_candidates: hasCandidates,
              aegis_learned_markers: hasLearned,
              aegis_marker_catalog: hasCatalog,
            },
          },
          markerEvents: markerEvents.map((e) => ({
            ...e,
            created_at: safeIso((e as any).created_at) ?? (e as any).created_at,
          })),
          candidates: candidates.map((c) => ({
            ...c,
            first_seen_at: safeIso((c as any).first_seen_at) ?? (c as any).first_seen_at,
            last_seen_at: safeIso((c as any).last_seen_at) ?? (c as any).last_seen_at,
            created_at: safeIso((c as any).created_at) ?? (c as any).created_at,
            updated_at: safeIso((c as any).updated_at) ?? (c as any).updated_at,
          })),
          learned: learned.map((l) => ({
            ...l,
            first_learned_at: safeIso((l as any).first_learned_at) ?? (l as any).first_learned_at,
            last_seen_at: safeIso((l as any).last_seen_at) ?? (l as any).last_seen_at,
            created_at: safeIso((l as any).created_at) ?? (l as any).created_at,
            updated_at: safeIso((l as any).updated_at) ?? (l as any).updated_at,
          })),
        },
      };
    }

    case "AUDIT": {
      const events = await audit.listPublic(sessionId, cmd.limit, cmd.since);
      return {
        ok: true,
        message: `Audit (public) returned ${events.length} events.`,
        payload: { events },
      };
    }

    case "BOOKCASE_LIST": {
      const items = await bookcase.list(sessionId);
      return {
        ok: true,
        message: `Bookcase returned ${items.length} items.`,
        payload: { items },
      };
    }

    case "BOOKCASE_SHELVE": {
      const item = await bookcase.shelve(
        sessionId,
        cmd.label,
        cmd.content,
        cmd.unshelve ?? ""
      );

      await audit.write({
        sessionId,
        channel: "PUBLIC",
        eventType: "BOOKCASE",
        severity: 0,
        axiomTags: ["SOVEREIGNTY", "TRANSPARENCY", "EQUILIBRIUM"],
        reasonCodes: ["BOOKCASE_SHELVED"],
        summary: `Bookcase shelved: ${item.label}`,
        details: {
          itemId: item.id,
          label: item.label,
          unshelveCondition: item.unshelveCondition,
        },
      });

      return { ok: true, message: `Shelved: ${item.label}`, payload: { item } };
    }

    case "BOOKCASE_UNSHELVE": {
      await bookcase.unshelve(sessionId, cmd.itemId);

      await audit.write({
        sessionId,
        channel: "PUBLIC",
        eventType: "BOOKCASE",
        severity: 0,
        axiomTags: ["SOVEREIGNTY", "TRANSPARENCY", "INTEGRATION"],
        reasonCodes: ["BOOKCASE_UNSHELVED"],
        summary: `Bookcase unshelved: ${cmd.itemId}`,
        details: { itemId: cmd.itemId },
      });

      return { ok: true, message: `Unshelved item ${cmd.itemId}` };
    }

    case "STORAGE_STATUS": {
      const settings = await getStorageSettings(db);
      const debug = await isDebugUnlocked(db, sessionId);
      return {
        ok: true,
        message: "Storage status loaded.",
        payload: { settings, debugUnlocked: debug },
      };
    }

    case "STORAGE_SET": {
      const next = await setStorageMode(db, cmd.mode);

      await audit.write({
        sessionId,
        channel: "PUBLIC",
        eventType: "SETTINGS",
        severity: 1,
        axiomTags: ["SOVEREIGNTY", "TRANSPARENCY", "EQUILIBRIUM"],
        reasonCodes: ["STORAGE_SETTING_CHANGED"],
        summary: `Storage mode set: ${cmd.mode}`,
        details: { mode: cmd.mode, next },
      });

      return {
        ok: true,
        message: `Storage mode set to ${cmd.mode}.`,
        payload: { next },
      };
    }

    case "DEBUG_UNLOCK": {
      if (!cmd.confirm) {
        return {
          ok: false,
          message: "To unlock deep debug: /aegis debug unlock --confirm=YES",
        };
      }

      await setDebugUnlocked(db, sessionId, true);

      await audit.write({
        sessionId,
        channel: "PUBLIC",
        eventType: "SYSTEM",
        severity: 2,
        axiomTags: ["SOVEREIGNTY", "TRANSPARENCY"],
        reasonCodes: ["DEBUG_UNLOCKED"],
        summary: "Deep debug unlocked for this session.",
        details: { sessionId },
      });

      return { ok: true, message: "Deep debug unlocked for this session." };
    }

    case "DEBUG_LOCK": {
      await setDebugUnlocked(db, sessionId, false);

      await audit.write({
        sessionId,
        channel: "PUBLIC",
        eventType: "SYSTEM",
        severity: 1,
        axiomTags: ["SOVEREIGNTY", "TRANSPARENCY"],
        reasonCodes: ["DEBUG_LOCKED"],
        summary: "Deep debug locked.",
        details: { sessionId },
      });

      return { ok: true, message: "Deep debug locked." };
    }

    case "EXPORT":
      return {
        ok: true,
        message: "Export requested. (POC stub)",
        payload: { action: "EXPORT_SESSION", sessionId },
      };

    case "PURGE": {
      if (!cmd.confirm) {
        return {
          ok: false,
          message: "To purge: /aegis purge --scope=session|all --confirm=YES",
        };
      }

      if (cmd.scope === "session") {
        await db.run("DELETE FROM sessions WHERE id = ?", sessionId);
        return {
          ok: true,
          message: "Purged current session (and cascaded logs/bookcase).",
        };
      }

      await db.exec("DELETE FROM audit_public;");
      await db.exec("DELETE FROM audit_private;");
      await db.exec("DELETE FROM bookcase_items;");
      await db.exec("DELETE FROM sessions;");

      return { ok: true, message: "Purged ALL local sessions/logs/bookcase." };
    }

    default:
      return { ok: false, message: "Unknown command." };
  }
}
