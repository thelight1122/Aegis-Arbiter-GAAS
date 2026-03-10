import fs from "fs";
import path from "path";
import { ensureDir } from "../utils/fs";

export interface RunContext {
  runId: string;
  runDir: string;
  createdTs: string;
  telemetryPath: string;
}

export function formatTimestampForFolder(ts: string): string {
  return ts.replace(/[:.]/g, "-");
}

export function createRunContext(rootDir: string, mode: string): RunContext {
  const createdTs = new Date().toISOString();
  const runId = formatTimestampForFolder(createdTs);
  const runDir = path.join(rootDir, "evidence", "runs", runId);
  ensureDir(runDir);

  const runJsonPath = path.join(runDir, "run.json");
  fs.writeFileSync(
    runJsonPath,
    JSON.stringify({ run_id: runId, created_ts: createdTs, mode }, null, 2) + "\n"
  );

  return {
    runId,
    runDir,
    createdTs,
    telemetryPath: path.join(runDir, "telemetry.jsonl")
  };
}
