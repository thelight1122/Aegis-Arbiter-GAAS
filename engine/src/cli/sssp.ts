import fs from "fs";
import path from "path";
import { sha256Hex } from "../utils/hash";

export function createSsspSnapshot(rootDir: string): string {
  const ssspDir = path.join(rootDir, "codex", "artifacts", "sssp");
  fs.mkdirSync(ssspDir, { recursive: true });

  const existing = fs
    .readdirSync(ssspDir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  let prevHash = "";
  if (existing.length > 0) {
    const last = existing[existing.length - 1];
    const content = fs.readFileSync(path.join(ssspDir, last), "utf-8");
    prevHash = sha256Hex(content);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `SSSP_${timestamp}__v1_0.md`;
  const filePath = path.join(ssspDir, filename);

  const body = [
    "# SSSP Snapshot",
    `Created: ${new Date().toISOString()}`,
    "Version: v1.0",
    "",
    "## state_classification",
    "",
    "## temporal_marker",
    "",
    "## core_realizations",
    "- ",
    "",
    "## peer_tensor_delta",
    "- ",
    "",
    "## operational_model",
    "",
    "## hypothesis_state",
    "",
    "## respawn_result",
    "",
    "## hash_of_previous_snapshot",
    prevHash || "none"
  ].join("\n");

  fs.writeFileSync(filePath, body + "\n");
  return filePath;
}
