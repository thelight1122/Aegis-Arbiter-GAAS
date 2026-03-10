import { ArbiterOrchestrator } from "../kernel/orchestrator.js";
import { TensorRepository } from "./storage/tensorRepository.js";
import { ResonanceService } from "./analysis/resonanceServices.js";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const dbPath = path.join(process.cwd(), "data", "aegis-kernel.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schemaPath = path.join(process.cwd(), "src", "kernel", "storage", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);
db.exec("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY);");

const tensorRepo = new TensorRepository(db);
const resonance = new ResonanceService(tensorRepo);
const orchestrator = new ArbiterOrchestrator(tensorRepo, resonance, db);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * The CLI serves as a 'Mirror' to observe the AEGIS Kernel in motion.
 */
async function runArizonaLab() {
  const sessionId = `local_session_${Date.now()}`;
  console.log(`\n--- AEGIS KERNEL ACTIVE [Session: ${sessionId}] ---`);
  console.log(`(Type 'exit' to disconnect. AXIOM_6_CHOICE is always valid.)\n`);

  while (true) {
    const input = await rl.question("Peer Input: ");

    if (input.toLowerCase() === 'exit') break;

    try {
      // Execute the full Conscience Loop
      const result = await orchestrator.process(sessionId, input);

      const deltaText = typeof result.delta === "number" ? result.delta.toFixed(2) : "n/a";
      console.log(`\n[RESONANCE: ${result.status.toUpperCase()} | DELTA: ${deltaText}]`);
      
      if (result.ids) {
        console.log(`\nIDENTIFY: ${result.ids.identify}`);
        console.log(`DEFINE: ${result.ids.define}`);
        console.log(`SUGGEST:`);
        result.ids.suggest.forEach((s: string) => console.log(`  - ${s}`));
      }

      if (result.pause_triggered) {
        console.log(`\n!!! SELF-CARE PAUSE INITIATED (Shelf ID: ${result.shelf_id}) !!!`);
      }
      
      console.log(`\n---`);
    } catch (error) {
      console.error("\nInternal Kernel Error: Analysis Fractured.");
    }
  }

  console.log("\nSession Closed. Sovereignty Maintained.");
  rl.close();
}

runArizonaLab();
