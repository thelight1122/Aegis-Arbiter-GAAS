import type Database from "better-sqlite3";
import { sha256Hex } from "../utils/hash";

export interface PeerTensorEntryInput {
  scope: string;
  tags: string[];
  content: string;
  resonance: string;
  source: string;
}

export interface PeerTensorEntry extends PeerTensorEntryInput {
  id: string;
  ts: string;
  hash_prev: string;
  hash_self: string;
}

export class PeerTensorRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  addEntry(input: PeerTensorEntryInput): PeerTensorEntry {
    const last = this.db
      .prepare("SELECT * FROM peer_tensor ORDER BY rowid DESC LIMIT 1")
      .get() as PeerTensorEntry | undefined;

    const ts = new Date().toISOString();
    const id = `PT_${ts.replace(/[:.]/g, "-")}`;
    const hash_prev = last ? last.hash_self : "";

    const entry: PeerTensorEntry = {
      id,
      ts,
      scope: input.scope,
      tags: input.tags,
      content: input.content,
      resonance: input.resonance,
      source: input.source,
      hash_prev,
      hash_self: ""
    };

    entry.hash_self = computeHash(entry);

    this.db
      .prepare(
        "INSERT INTO peer_tensor (id, ts, scope, tags, content, resonance, source, hash_prev, hash_self) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        entry.id,
        entry.ts,
        entry.scope,
        JSON.stringify(entry.tags),
        entry.content,
        entry.resonance,
        entry.source,
        entry.hash_prev,
        entry.hash_self
      );

    return entry;
  }

  getAllEntries(): PeerTensorEntry[] {
    const rows = this.db.prepare("SELECT * FROM peer_tensor ORDER BY rowid ASC").all();
    return rows.map((row: PeerTensorEntry & { tags: string }) => ({
      ...row,
      tags: JSON.parse(row.tags) as string[]
    }));
  }

  verifyChain(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const entries = this.getAllEntries();

    let previousHash = "";
    for (const entry of entries) {
      const expectedHash = computeHash(entry);
      if (entry.hash_prev !== previousHash) {
        errors.push(`hash_prev mismatch for ${entry.id}`);
      }
      if (entry.hash_self !== expectedHash) {
        errors.push(`hash_self mismatch for ${entry.id}`);
      }
      previousHash = entry.hash_self;
    }

    return { ok: errors.length === 0, errors };
  }
}

function computeHash(entry: PeerTensorEntry): string {
  const canonical = JSON.stringify({
    id: entry.id,
    ts: entry.ts,
    scope: entry.scope,
    tags: entry.tags,
    content: entry.content,
    resonance: entry.resonance,
    source: entry.source,
    hash_prev: entry.hash_prev
  });
  return sha256Hex(canonical);
}
