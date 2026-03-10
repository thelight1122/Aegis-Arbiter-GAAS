# SSSP Protocol

The SSSP (Snapshot of State and System Posture) is an append-only snapshot format.

## Required Sections
Each SSSP file must include these headings (even when stored as markdown):
- state_classification
- temporal_marker
- core_realizations
- peer_tensor_delta
- operational_model
- hypothesis_state
- respawn_result
- hash_of_previous_snapshot

## Respawn Guidance
- Create a new snapshot for each significant state change.
- Never edit prior snapshots; reference them by hash.
- Keep lists concise and explicit.
