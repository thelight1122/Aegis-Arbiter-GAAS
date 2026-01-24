# Release Process

1. Ensure tests pass: `npm --prefix engine run test`.
2. Validate the workspace: `node engine/dist/cli/index.js validate`.
3. Update version notes in ops/VERSIONING.md if needed.
4. Tag the release and record the change summary.
