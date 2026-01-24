# Data Flow

1. Input arrives via CLI.
2. Lens routes and tags the input.
3. Arbiter lints and produces findings.
4. IDS suggests responses.
5. Peer Tensor stores deltas in SQLite.
6. Evidence is written to evidence/runs/<timestamp>/.
