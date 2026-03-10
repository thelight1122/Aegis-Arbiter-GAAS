import { openDatabase } from "../storage/sqlite/db";
import { PeerTensorRepository } from "../tensors/peerTensor";

export function addTensorEntry(rootDir: string, content: string): string {
  const db = openDatabase(rootDir);
  const repo = new PeerTensorRepository(db);
  const entry = repo.addEntry({
    scope: "global",
    tags: [],
    content,
    resonance: "neutral",
    source: "cli"
  });
  db.close();
  return entry.id;
}
