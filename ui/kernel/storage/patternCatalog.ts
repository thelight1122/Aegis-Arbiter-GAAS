import { createHash } from "node:crypto";
import type { Database } from "better-sqlite3";

export interface PatternMatch {
  pattern_id: string;
  axiom_tag: string;
  occurrence_count: number;
  last_resolution: string;
}

/**
 * The PatternCatalogService (PIM/QRC) identifies recurring drift.
 * It fulfills the requirement for a 'Quick Reference Catalog' (MAP v1.7).
 */
export class PatternCatalogService {
  constructor(private db: Database) {}

  /**
   * Generates a fingerprint and checks for a known friction pattern.
   * Fulfills AXIOM_5_AWARENESS.
   */
  check(findingText: string): PatternMatch | null {
    const fingerprint = createHash("md5").update(findingText).digest("hex");

    const row = this.db.prepare(`
      SELECT id, axiom_tags, summary 
      FROM audit_public 
      WHERE details_json LIKE ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(`%${fingerprint}%`);

    if (!row) return null;

    return {
      pattern_id: fingerprint,
      axiom_tag: (row as any).axiom_tags.split(',')[0],
      occurrence_count: 1, // Logic for counting would query the tensor table
      last_resolution: (row as any).summary
    };
  }
}
