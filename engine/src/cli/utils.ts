import fs from "fs";

export function ensureReadableFile(path: string): void {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
}
