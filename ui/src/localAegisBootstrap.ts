// /src/localAegisBootstrap.ts

import { openDb } from "./storage/sqlite/db.js";
import { applyMigrations } from "./storage/sqlite/migrate.js";
import { ensureSession } from "./settings/storageSettings.js";
import { AuditLogger } from "./audit/auditLogger.js";
import { Bookcase } from "./bookcase/bookcase.js";
import { parseSovereignCommand } from "./sovereign/commands/parseSovereignCommand.js";
import { handleSovereignCommand } from "./sovereign/commands/handleSovereignCommand.js";

import { ensureAegisSeed } from "./storage/sqlite/aegisSeed.js";
import { AegisSqliteRepo } from "./storage/sqlite/aegisRepo.js";

/**
 * POC entry function:
 * - ensures DB + schema
 * - ensures session
 * - routes /aegis commands
 *
 * You will wire this into your chat loop and Ghost-Layer UI.
 */
export async function localAegisBootstrap() {
  const db = await openDb();
  await applyMigrations(db);

  // Native handle is node:sqlite DatabaseSync
  const nativeDb = db.db;

  // Your existing settings layer owns this session ID
  const sessionId = await ensureSession(db);

  // Local-only ALPHA identities (demo defaults)
  const orgId = "local-org";
  const userId = "local-user";

  ensureAegisSeed(nativeDb, {
    orgId,
    orgName: "AEGIS Local ALPHA",
    userId,
    displayName: "Local Operator",
  });

  // Mirror the session into aegis_sessions (so Arbiter can pause it)
  const repo = new AegisSqliteRepo(nativeDb);
  repo.ensureSessionRow({ sessionId, orgId, userId });

  const audit = new AuditLogger(db);
  const bookcase = new Bookcase(db);

  return async function handleUserInput(input: string) {
    const cmd = parseSovereignCommand(input);
    if (!cmd) {
      return { ok: true, message: "Not a sovereign command. Pass to LLM pipeline." };
    }

    return await handleSovereignCommand({
      db,
      audit,
      bookcase,
      sessionId,
      cmd,
    });
  };
}
