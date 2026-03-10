import fs from "fs";
import path from "path";
import { createRunContext } from "../telemetry/run";
import { TelemetryEmitter } from "../telemetry/emitter";

interface ReplaySummary {
  run_id: string;
  event_count: number;
  findings_count: number;
}

export function replayRun(rootDir: string, runFolder: string): string {
  const sourceDir = path.isAbsolute(runFolder) ? runFolder : path.join(rootDir, runFolder);
  const telemetryPath = path.join(sourceDir, "telemetry.jsonl");
  const findingsPath = path.join(sourceDir, "findings.json");

  const telemetryLines = fs.existsSync(telemetryPath)
    ? fs.readFileSync(telemetryPath, "utf-8").trim().split(/
/).filter(Boolean)
    : [];
  const findings = fs.existsSync(findingsPath)
    ? (JSON.parse(fs.readFileSync(findingsPath, "utf-8")) as unknown[])
    : [];

  const run = createRunContext(rootDir, "replay");
  const summary: ReplaySummary = {
    run_id: run.runId,
    event_count: telemetryLines.length,
    findings_count: findings.length
  };

  const summaryMarkdown = [
    "# Replay Summary",
    `Source: ${sourceDir}`,
    `Events: ${summary.event_count}`,
    `Findings: ${summary.findings_count}`,
    ""
  ].join("\n");

  fs.writeFileSync(path.join(run.runDir, "summary.md"), summaryMarkdown + "\n");

  const emitter = new TelemetryEmitter(run.telemetryPath);
  emitter.append({
    ts: new Date().toISOString(),
    session_id: run.runId,
    mode: "replay",
    lens: { mental: "steady" },
    tension: "neutral",
    tags: ["replay"],
    payload: summary,
    source: "cli"
  });

  return run.runDir;
}
