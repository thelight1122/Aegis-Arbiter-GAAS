import type { Database } from "better-sqlite3";

/**
 * The ResetService manages the system's return to a 'Rested' state.
 * It fulfills the 'Axiomatic Reset' requirement (Section XIII).
 */
export class ResetService {
  constructor(private db: Database) {}

  /**
   * Purges volatile Peer Tensors while preserving the Logic Spine.
   * Fulfills AXIOM_1_BALANCE.
   */
  async reset(sessionId: string): Promise<{ ok: boolean; purged_count: number }> {
    // Purge all un-pinned PT tensors for the session.
    // ST tensors (Spine) are preserved to maintain 'Loyalty' (Virtue 5).
    const stmt = this.db.prepare(`
      DELETE FROM tensors 
      WHERE session_id = ? 
      AND tensor_type = 'PT' 
      AND is_pinned = 0
    `);

    const result = stmt.run(sessionId);

    // After purge, the system 'Inhales' (The Pause) and resets the state.
    return {
      ok: true,
      purged_count: result.changes
    };
  }
}
