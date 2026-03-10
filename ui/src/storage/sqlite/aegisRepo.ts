// /src/storage/sqlite/aegisRepo.ts

import crypto from "node:crypto";
import type { DatabaseSync as Database } from "node:sqlite";

export type AegisSessionStatus = "active" | "paused" | "closed";
export type AegisScopeType = "org" | "user";

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export type PromotionConfig = {
  spacingMinutes: number;
  minTotal: number;
  minSpaced: number;
};

export type DecisionPacket = {
  sessionId: string;
  status: AegisSessionStatus;
  integrityResonance: number;
  pausedBecause?: { markerIds: string[]; threshold: number };
};

export class AegisSqliteRepo {
  constructor(private readonly db: Database) {}

  ensureSessionRow(params: { sessionId: string; orgId: string; userId: string }): void {
    const existing = this.db
      .prepare(`SELECT id FROM aegis_sessions WHERE id = ?`)
      .get(params.sessionId) as any;

    if (existing) return;

    this.db.prepare(
      `INSERT INTO aegis_sessions (id, org_id, user_id, status, integrity_resonance, peer_state)
       VALUES (?, ?, ?, 'active', 1.0, '{}')`
    ).run(params.sessionId, params.orgId, params.userId);
  }

  getSession(sessionId: string): { id: string; status: AegisSessionStatus; integrity_resonance: number; peer_state: string; org_id: string; user_id: string } | null {
    const row = this.db
      .prepare(`SELECT id, status, integrity_resonance, peer_state, org_id, user_id FROM aegis_sessions WHERE id = ?`)
      .get(sessionId) as any;
    return row ?? null;
  }

  setSessionStatus(sessionId: string, status: AegisSessionStatus): void {
    const ended_at = status === "closed" ? nowIso() : null;
    this.db
      .prepare(`UPDATE aegis_sessions SET status = ?, ended_at = COALESCE(?, ended_at) WHERE id = ?`)
      .run(status, ended_at, sessionId);
  }

  setIntegrityResonance(sessionId: string, resonance: number): void {
    this.db
      .prepare(`UPDATE aegis_sessions SET integrity_resonance = ? WHERE id = ?`)
      .run(resonance, sessionId);
  }

  getPromotionConfig(orgId: string, userId?: string): PromotionConfig {
    const org = this.getTemporalConstraints("org", orgId);
    const user = userId ? this.getTemporalConstraints("user", userId) : null;

    const orgC = org ?? {};
    const userC = user ?? {};

    const spacingMinutes =
      (userC as any)?.integrity?.spacing?.minutes ??
      (orgC as any)?.integrity?.spacing?.minutes ??
      30;

    const minTotal =
      (userC as any)?.integrity?.promotion?.minTotal ??
      (orgC as any)?.integrity?.promotion?.minTotal ??
      3;

    const minSpaced =
      (userC as any)?.integrity?.promotion?.minSpaced ??
      (orgC as any)?.integrity?.promotion?.minSpaced ??
      2;

    return { spacingMinutes, minTotal, minSpaced };
  }

  getPauseThreshold(orgId: string, userId?: string): number {
    const org = this.getTemporalConstraints("org", orgId);
    const user = userId ? this.getTemporalConstraints("user", userId) : null;

    return (
      (user as any)?.integrity?.thresholds?.pause ??
      (org as any)?.integrity?.thresholds?.pause ??
      0.999
    );
  }

  private getTemporalConstraints(scopeType: AegisScopeType, scopeId: string): Record<string, unknown> | null {
    const row = this.db
      .prepare(`SELECT constraints FROM aegis_temporal_tensors WHERE scope_type = ? AND scope_id = ?`)
      .get(scopeType, scopeId) as any;

    if (!row) return null;
    return parseJson<Record<string, unknown>>(row.constraints, {});
  }

  computeIntegrityResonance(params: { roots: Record<string, 0 | 1>; compassionReady: boolean }): number {
    const product = Object.values(params.roots).reduce<number>((acc, v) => acc * v, 1);
    const co = params.compassionReady ? 1 : 0;
    return product * co; // ALPHA: discrete. Later can become graded.
  }

  maybePauseSession(params: {
    orgId: string;
    userId: string;
    sessionId: string;
    integrityResonance: number;
    violatedRootMarkerIds: string[];
  }): DecisionPacket {
    const threshold = this.getPauseThreshold(params.orgId, params.userId);

    this.setIntegrityResonance(params.sessionId, params.integrityResonance);

    const session = this.getSession(params.sessionId);
    const currentStatus = (session?.status ?? "active") as AegisSessionStatus;

    if (params.integrityResonance < threshold && currentStatus !== "paused") {
      this.setSessionStatus(params.sessionId, "paused");
      return {
        sessionId: params.sessionId,
        status: "paused",
        integrityResonance: params.integrityResonance,
        pausedBecause: { markerIds: params.violatedRootMarkerIds, threshold },
      };
    }

    return { sessionId: params.sessionId, status: currentStatus, integrityResonance: params.integrityResonance };
  }

  // (Optional) Marker observation + promotion can be added next; applyArbiter can pause without it.
}
