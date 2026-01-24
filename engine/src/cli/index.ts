import path from "path";
import { runLint } from "./lint";
import { createSsspSnapshot } from "./sssp";
import { addTensorEntry } from "./tensor";
import { replayRun } from "./replay";
import { validateWorkspace, formatValidation } from "./validate";

const [, , command, ...args] = process.argv;
const rootDir = process.cwd();

function usage(): void {
  const text = [
    "Usage:",
    "  node dist/cli/index.js lint <text|file>",
    "  node dist/cli/index.js sssp:create",
    "  node dist/cli/index.js tensor:add <entry>",
    "  node dist/cli/index.js replay <run_folder>",
    "  node dist/cli/index.js validate"
  ].join("\n");
  console.log(text);
}

if (!command) {
  usage();
  process.exitCode = 1;
} else if (command === "lint") {
  const input = args.join(" ").trim();
  if (!input) {
    usage();
    process.exitCode = 1;
  } else {
    const result = runLint(rootDir, input);
    console.log(`Lint run written to ${path.relative(rootDir, result.runDir)}`);
  }
} else if (command === "sssp:create") {
  const filePath = createSsspSnapshot(rootDir);
  console.log(`SSSP created: ${path.relative(rootDir, filePath)}`);
} else if (command === "tensor:add") {
  const entry = args.join(" ").trim();
  if (!entry) {
    usage();
    process.exitCode = 1;
  } else {
    const id = addTensorEntry(rootDir, entry);
    console.log(`Peer Tensor entry added: ${id}`);
  }
} else if (command === "replay") {
  const runFolder = args[0];
  if (!runFolder) {
    usage();
    process.exitCode = 1;
  } else {
    const runDir = replayRun(rootDir, runFolder);
    console.log(`Replay output written to ${path.relative(rootDir, runDir)}`);
  }
} else if (command === "validate") {
  const result = validateWorkspace(rootDir);
  console.log(formatValidation(result));
  process.exitCode = result.errors.length > 0 ? 1 : 0;
} else {
  usage();
  process.exitCode = 1;
}
