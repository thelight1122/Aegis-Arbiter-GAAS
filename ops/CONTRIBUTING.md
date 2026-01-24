# Contributing

## Setup
1. From repo root: `cd engine`
2. Install dependencies: `npm install`
3. Build the CLI: `npm run build`

## CLI Usage
- Lint text: `node dist/cli/index.js lint "your text"`
- Lint file: `node dist/cli/index.js lint path/to/file.txt`
- Create SSSP: `node dist/cli/index.js sssp:create`
- Add Peer Tensor entry: `node dist/cli/index.js tensor:add "entry text"`
- Replay run: `node dist/cli/index.js replay evidence/runs/<run_id>`
- Validate workspace: `node dist/cli/index.js validate`

## Evidence Outputs
Runs are written to `evidence/runs/<timestamp>/` and include:
- `telemetry.jsonl`
- `findings.json`
- `summary.md`
- `run.json`
