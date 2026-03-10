// /src/arbiter/applyArbiter.ts

import { AuditLogger } from "../audit/auditLogger.js";
import type { AxiomTag } from "../audit/auditTypes.js";
import type { SqliteDb } from "../storage/sqlite/db.js";
import { getStorageSettings } from "../settings/storageSettings.js";
import { lintVinegar } from "./vinegarLinter.js";

import { AegisSqliteRepo } from "../storage/sqlite/aegisRepo.js";

export interface ArbiterApplyResult {
  flagged: boolean;
  counts: {
    vinegar: number;
    certainty: number;
    hierarchy: number;
    total: number;
  };
  findingsSummary: Array<{
    kind: string;
    count: number;
    samples: string[];
  }>;
}

/**
 * Deterministic mapping from lint signals -> Integrity Roots.
 * Conservative: maps observable markers only.
 *
 * Convention:
 *   1 = stable (no detected issue for that root proxy)
 *   0 = unstable (detected issue that correlates with that root proxy)
 */
function rootsFromLintSignals(args: {
  vinegar: number;
  certainty: number;
  hierarchy: number;
}): Record<string, 0 | 1> {
  const { vinegar, certainty, hierarchy } = args;

  return {
    "root.honesty": 1,
    "root.respect": hierarchy > 0 ? 0 : 1,
    "root.attention": 1,
    "root.affection": vinegar > 0 ? 0 : 1,
    "root.loyalty": 1,
    "root.trust": certainty > 0 ? 0 : 1,
    "root.communication": 1,
  };
}

/**
 * Flag-only Arbiter + AEGIS Session State Gate + Time Markers
 * - Runs deterministic lint
 * - Writes PUBLIC audit event if anything is flagged
 * - Updates aegis_sessions.integrity_resonance
 * - Sets session posture to 'paused' when Integrity Resultant drops below threshold
 * - Observes violated root markers (candidate -> learned promotion over time)
 * - Does NOT rewrite text
 */
export async function applyArbiterFlagOnly(args: {
  db: SqliteDb;
  audit: AuditLogger;
  sessionId: string;
  text: string;
  context?: Record<string, unknown>;
}): Promise<ArbiterApplyResult> {
  const { db, audit, sessionId, text, context } = args;

  const settings = await getStorageSettings(db);
  const lint = lintVinegar(text);

  const vinegar = lint.counts.VINEGAR_TONE;
  const certainty = lint.counts.COERCIVE_CERTAINTY;
  const hierarchy = lint.counts.HIERARCHY_MARKER;
  const total = vinegar + certainty + hierarchy;

  const flagged = total > 0;

  const findingsSummary = lint.findings.map((f) => ({
    kind: f.kind,
    count: f.matches.length,
    samples: f.matches.slice(0, 3).map((m) => m.excerpt),
  }));

  // ------------------------------------------------------------
  // AEGIS Gate: compute Integrity Resultant proxy + maybe pause
  // + observe violated roots (time markers)
  // ------------------------------------------------------------
  let aegisGate: {
    attempted: boolean;
    paused: boolean;
    integrity_resonance?: number;
    pausedBecause?: { markerIds: string[]; threshold: number };
    observedMarkers?: string[];
    note?: string;
  } = { attempted: false, paused: false };

  try {
    // NodeSqliteDb exposes native DatabaseSync at db.db
    const nativeDb = db.db;
    const repo = new AegisSqliteRepo(nativeDb);

    const session = repo.getSession(sessionId);
    if (!session) {
      aegisGate = {
        attempted: false,
        paused: false,
        note: "AEGIS gate skipped: session not found in aegis_sessions (ensureSessionRow missing?).",
      };
    } else {
      const roots = rootsFromLintSignals({ vinegar, certainty, hierarchy });

      // ALPHA CO proxy: treat "not flagged" as ready.
      // This is a technical gate, not a claim about internal states.
      const compassionReady = !flagged;

      const integrityResonance = repo.computeIntegrityResonance({
        roots,
        compassionReady,
      });

      const violatedRootMarkerIds = Object.entries(roots)
        .filter(([, v]) => v === 0)
        .map(([k]) => k);

      // Apply pause transition
      const decision = repo.maybePauseSession({
        orgId: session.org_id,
        userId: session.user_id,
        sessionId,
        integrityResonance,
        violatedRootMarkerIds,
      });

      // Observe violated roots as markers (this is the "time exists" mechanism)
      // Evidence is intentionally lightweight: marker IDs + counts only, no raw transcript storage.
      const observed: string[] = violatedRootMarkerIds;

      aegisGate = {
        attempted: true,
        paused: decision.status === "paused",
        integrity_resonance: decision.integrityResonance,
        pausedBecause: decision.pausedBecause,
        observedMarkers: observed,
      };
    }
  } catch (err) {
    aegisGate = {
      attempted: false,
      paused: false,
      note: `AEGIS gate skipped due to error: ${(err as Error)?.message ?? String(err)}`,
    };
  }

  // ------------------------------------------------------------
  // Audit event (flag-only), with AEGIS gate packet attached
  // ------------------------------------------------------------
  if (flagged || aegisGate.paused) {
    const axiomTags: AxiomTag[] = [
      "TRANSPARENCY",
      "SOVEREIGNTY",
      "EQUILIBRIUM",
      "NEUTRALITY",
    ];

    const details =
      settings.mode === "minimal"
        ? {
            counts: { vinegar, certainty, hierarchy, total },
            kinds: lint.findings.map((f) => f.kind),
            aegisGate,
            context: context ?? {},
          }
        : settings.mode === "standard"
        ? {
            counts: { vinegar, certainty, hierarchy, total },
            findingsSummary,
            aegisGate,
            context: context ?? {},
          }
        : {
            counts: { vinegar, certainty, hierarchy, total },
            findings: lint.findings,
            findingsSummary,
            aegisGate,
            context: context ?? {},
          };

    const reasonCodes = Array.from(
      new Set(lint.findings.map((f) => f.reasonCode))
    );

    const gateLine =
      aegisGate.attempted && typeof aegisGate.integrity_resonance === "number"
        ? ` | integrity_resonance=${aegisGate.integrity_resonance}${
            aegisGate.paused ? " (paused)" : ""
          }`
        : "";

    await audit.write({
      sessionId,
      channel: "PUBLIC",
      eventType: "ARBITER_INTERVENTION",
      severity: 1,
      axiomTags,
      reasonCodes,
      summary: `Arbiter flag-only: ${total} marker(s) detected (vinegar=${vinegar}, certainty=${certainty}, hierarchy=${hierarchy})${gateLine}`,
      details,
    });
  }

  return {
    flagged,
    counts: { vinegar, certainty, hierarchy, total },
    findingsSummary,
  };
}
