import fs from "fs";
import path from "path";
import { openDatabase } from "../storage/sqlite/db";
import { PeerTensorRepository } from "../tensors/peerTensor";
import { readJsonFile } from "../utils/fs";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const REQUIRED_FILES = [
  "codex/canon/AEGIS_CANON.md",
  "codex/canon/GLOSSARY.md",
  "codex/canon/BOUNDARIES.md",
  "codex/protocols/SSSP.md",
  "codex/protocols/IDS.md",
  "codex/protocols/LINT.md",
  "codex/maps/SYSTEM_MAP.md",
  "codex/maps/DATA_FLOW.md",
  "codex/CODEX_LOCKS.md",
  "ops/CONTRIBUTING.md",
  "ops/RELEASE.md",
  "ops/VERSIONING.md"
];

const REQUIRED_SSSP_HEADINGS = [
  "state_classification",
  "temporal_marker",
  "core_realizations",
  "peer_tensor_delta",
  "operational_model",
  "hypothesis_state",
  "respawn_result",
  "hash_of_previous_snapshot"
];

interface RunMetadata {
  run_id: string;
  created_ts: string;
  mode: string;
}

export function validateWorkspace(rootDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  const ssspDir = path.join(rootDir, "codex", "artifacts", "sssp");
  if (fs.existsSync(ssspDir)) {
    const files = fs.readdirSync(ssspDir).filter((name) => name.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(ssspDir, file), "utf-8");
      for (const heading of REQUIRED_SSSP_HEADINGS) {
        const headingPattern = new RegExp(`^##\s+${heading}\s*$`, "m");
        if (!headingPattern.test(content)) {
          errors.push(`SSSP missing heading ${heading}: ${file}`);
        }
      }
    }
  }

  const runsDir = path.join(rootDir, "evidence", "runs");
  if (fs.existsSync(runsDir)) {
    const runFolders = fs.readdirSync(runsDir);
    for (const runId of runFolders) {
      const runPath = path.join(runsDir, runId);
      if (!fs.statSync(runPath).isDirectory()) {
        continue;
      }
      const runJsonPath = path.join(runPath, "run.json");
      if (!fs.existsSync(runJsonPath)) {
        warnings.push(`Missing run.json for run ${runId}`);
        continue;
      }
      const runMeta = readJsonFile<RunMetadata>(runJsonPath);
      const createdTs = Date.parse(runMeta.created_ts);
      const thresholdMs = createdTs + 5 * 60 * 1000;
      for (const file of fs.readdirSync(runPath)) {
        const filePath = path.join(runPath, file);
        if (fs.statSync(filePath).isFile()) {
          const mtime = fs.statSync(filePath).mtimeMs;
          if (mtime > thresholdMs) {
            warnings.push(`Possible rewrite detected in run ${runId}: ${file}`);
          }
        }
      }
    }
  }

  const db = openDatabase(rootDir);
  const repo = new PeerTensorRepository(db);
  const chain = repo.verifyChain();
  if (!chain.ok) {
    errors.push(...chain.errors);
  }
  db.close();

  return { errors, warnings };
}

export function formatValidation(result: ValidationResult): string {
  const lines: string[] = ["# Validation Report", ""];
  if (result.errors.length === 0) {
    lines.push("Errors: none");
  } else {
    lines.push("Errors:");
    for (const err of result.errors) {
      lines.push(`- ${err}`);
    }
  }
  if (result.warnings.length === 0) {
    lines.push("Warnings: none");
  } else {
    lines.push("Warnings:");
    for (const warn of result.warnings) {
      lines.push(`- ${warn}`);
    }
  }
  return lines.join("\n") + "\n";
}
