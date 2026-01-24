import fs from "fs";
import path from "path";
import { lintText } from "../arbiter/index";
import { routeInput } from "../lens/index";
import { createRunContext } from "../telemetry/run";
import { TelemetryEmitter } from "../telemetry/emitter";
import type { Finding } from "../arbiter/index";

export interface LintResult {
  runDir: string;
  findings: Finding[];
}

export function runLint(rootDir: string, input: string): LintResult {
  const text = fs.existsSync(input) ? fs.readFileSync(input, "utf-8") : input;
  const run = createRunContext(rootDir, "lint");
  const lensResult = routeInput(text);
  const findings = lintText(text);

  const emitter = new TelemetryEmitter(run.telemetryPath);
  emitter.append({
    ts: new Date().toISOString(),
    session_id: run.runId,
    mode: "lint",
    lens: lensResult.lens,
    tension: lensResult.tension,
    tags: lensResult.tags,
    payload: { finding_count: findings.length },
    source: "cli"
  });

  fs.writeFileSync(
    path.join(run.runDir, "findings.json"),
    JSON.stringify(findings, null, 2) + "\n"
  );

  const summary = [
    "# Lint Summary",
    `Run: ${run.runId}`,
    `Findings: ${findings.length}`,
    ""
  ].join("\n");

  fs.writeFileSync(path.join(run.runDir, "summary.md"), summary + "\n");

  return { runDir: run.runDir, findings };
}
