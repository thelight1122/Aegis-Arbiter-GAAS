// /src/bookcase/bookcase.ts

import crypto from "crypto";
import type { SqliteDb } from "../storage/sqlite/db.js";

export interface BookcaseItem {
  id: string;
  sessionId: string;
  createdAt: string;
  label: string;
  content: string;
  unshelveCondition: string;
  status: "SHELVED" | "UNSHELVED" | "PURGED";
  unshelvedAt?: string | null;
}

export class Bookcase {
  constructor(private db: SqliteDb) {}

  async list(sessionId: string): Promise<BookcaseItem[]> {
    const rows = await this.db.all<any[]>(
      `SELECT * FROM bookcase_items
       WHERE session_id = ? AND status != 'PURGED'
       ORDER BY created_at DESC`,
      sessionId
    );

    return rows.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      createdAt: r.created_at,
      label: r.label,
      content: r.content,
      unshelveCondition: r.unshelve_condition,
      status: r.status,
      unshelvedAt: r.unshelved_at,
    })) as BookcaseItem[];
  }

  async shelve(sessionId: string, label: string, content: string, unshelveCondition = ""): Promise<BookcaseItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO bookcase_items
       (id, session_id, created_at, label, content, unshelve_condition, status)
       VALUES (?, ?, ?, ?, ?, ?, 'SHELVED')`,
      id,
      sessionId,
      now,
      label,
      content,
      unshelveCondition
    );

    return {
      id,
      sessionId,
      createdAt: now,
      label,
      content,
      unshelveCondition,
      status: "SHELVED",
      unshelvedAt: null,
    };
  }

  async unshelve(sessionId: string, itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE bookcase_items
       SET status = 'UNSHELVED', unshelved_at = ?
       WHERE id = ? AND session_id = ?`,
      now,
      itemId,
      sessionId
    );
  }

  async purgeSession(sessionId: string): Promise<void> {
    await this.db.run(
      `UPDATE bookcase_items SET status = 'PURGED'
       WHERE session_id = ?`,
      sessionId
    );
  }
}
