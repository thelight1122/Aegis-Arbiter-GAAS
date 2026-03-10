// /src/audit/auditLogger.ts

import crypto from "crypto";
import type { SqliteDb } from "../storage/sqlite/db.js";
import type { AuditEvent } from "./auditTypes.js";

function uuid(): string {
  return crypto.randomUUID();
}

function asJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 0);
}

export class AuditLogger {
  constructor(private db: SqliteDb) {}

  async write(event: Omit<AuditEvent, "id" | "createdAt"> & Partial<Pick<AuditEvent, "id" | "createdAt">>): Promise<AuditEvent> {
    const full: AuditEvent = {
      id: event.id ?? uuid(),
      createdAt: event.createdAt ?? new Date().toISOString(),
      sessionId: event.sessionId,
      channel: event.channel,
      eventType: event.eventType,
      severity: event.severity,
      axiomTags: event.axiomTags,
      reasonCodes: event.reasonCodes,
      summary: event.summary,
      details: event.details ?? {},
    };

    const table = full.channel === "PUBLIC" ? "audit_public" : "audit_private";

    await this.db.run(
      `INSERT INTO ${table} (id, session_id, created_at, event_type, severity, axiom_tags, reason_codes, summary, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      full.id,
      full.sessionId,
      full.createdAt,
      full.eventType,
      full.severity,
      full.axiomTags.join(","),
      full.reasonCodes.join(","),
      full.summary,
      asJson(full.details)
    );

    return full;
  }

  async listPublic(sessionId: string, limit = 50, sinceIso?: string): Promise<AuditEvent[]> {
    const rows = await this.db.all<any[]>(
      `SELECT * FROM audit_public
       WHERE session_id = ?
       ${sinceIso ? "AND created_at >= ?" : ""}
       ORDER BY created_at DESC
       LIMIT ?`,
      ...(sinceIso ? [sessionId, sinceIso, limit] : [sessionId, limit])
    );

    return rows.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      createdAt: r.created_at,
      channel: "PUBLIC",
      eventType: r.event_type,
      severity: r.severity,
      axiomTags: String(r.axiom_tags || "").split(",").filter(Boolean),
      reasonCodes: String(r.reason_codes || "").split(",").filter(Boolean),
      summary: r.summary,
      details: safeParse(r.details_json),
    })) as AuditEvent[];
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}
