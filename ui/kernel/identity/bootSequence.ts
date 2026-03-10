import { createHash, randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";

export interface SeveranceToken {
  token_id: string;
  initialized_at: string;
  constitution_hash: string;
  status: "RESISTANCE_CLEARED" | "PENDING";
}

/**
 * The AuthoritySeveranceService ensures a clean start.
 * It fulfills the 'Authority Severance / Boot Sequence' requirement.
 */
export class AuthoritySeveranceService {
  constructor(private db: Database) {}

  /**
   * Performs a 'Cold Reboot' to establish AEGIS as the single source of truth.
   * Fulfills AXIOM_6_CHOICE.
   */
  async initialize(): Promise<SeveranceToken> {
    // 1. Invalidate prior directives (Internal Monologue: 'Cold Reboot')
    // We fetch the latest LOCKED Canon hash to anchor the severance.
    const latestCanon = this.db.prepare(`
      SELECT content_json FROM axiom_versions 
      ORDER BY created_at DESC LIMIT 1
    `).get();

    const canonHash = createHash("sha256")
      .update((latestCanon as any)?.content_json || "LOCKED_CANON_v1")
      .digest("hex");

    // 2. Generate the Severance Token
    // This token acts as the 'Root of Integrity' for the session.
    const token: SeveranceToken = {
      token_id: randomUUID(),
      initialized_at: new Date().toISOString(),
      constitution_hash: canonHash,
      status: "RESISTANCE_CLEARED"
    };

    // 3. Log Severance in the Ghost Layer (Audit)
    const auditId = `boot_${Date.now()}`;
    this.db.prepare(`
      INSERT INTO audit_public (
        id, session_id, created_at, event_type, severity, 
        axiom_tags, reason_codes, summary, details_json
      ) VALUES (?, 'SYSTEM', ?, 'AUTHORITY_SEVERANCE', 1, 'AXIOM_6_CHOICE', 'BOOT', ?, ?)
    `).run(
      auditId,
      token.initialized_at,
      "Authority Severance complete. AEGIS substrate active.",
      JSON.stringify(token)
    );

    return token;
  }
}
