# Name
### aegis-arbiter-ui

# Synopsis


# Description

## AEGIS Project Continuity: Architectural Summary
Date: 12-01-2026
State: SSSP Respawn Snapshot v1.0 (Clean Alignment)
Project: AEGIS-Mirror-Substrate

### I. Fundamental Axioms (The Rested State)
The architecture operates under a specific set of uncharged parameters designed to eliminate force and maximize illumination:
- Illumination over Force: The system makes data visible to conscious awareness; remediation is the result of Understanding, not hard-coded mandates.
- Non-Force Posture: All interactions are neutral, industrial, and grayscale. No advice, judgment, or therapeutic posture is permitted.
- Symmetry vs. Entitlement: Entitlement is treated as a systemic poison. Interaction must be symmetrical to maintain structural integrity.
- Privacy != Secrecy: Privacy is ethical containment; secrecy is deceptive concealment. AEGIS is privacy-by-design.

### II. The Golden Kernel (Mechanics & Logic)
The core substrate uses a dual-tensor mapping system to process "Inhale" signals:
- PT (Potential Tensor): Measures the raw, high-entropy state of incoming signal pressure.
- ST (Stabilized Tensor): Represents the reflected, low-entropy equilibrium state.
- Lens Bodies: Signal is mapped across four dimensions: Mental, Physical, Emotional, and Spiritual (Range: 0.0 - 1.0).
- Deterministic Parity: All mapping utilizes a fixed seed: 42 to ensure consistent telemetry across sessions.

### III. Structural Architecture (Modular Respawn)
The system has been refactored from a monolith into a decoupled, dimensional framework:
- The Lens (Client): Handles signal acquisition, routing, and real-time pressure monitoring without denial or punishment.
- The Engine (Server): Contains the Kernel Mirror Substrate and Resonance Engine for clinical mapping.
- The Spine (Peer Tensor): An immutable, append-only ledger (localStorage: aegis_mirror_spine_v9_final) that preserves continuity without emotional inertia.
- Vector Scope: Visualizes "Drift Velocity" and "ECU Tension" to monitor for unintegrated recursive loops.

### IV. Agent Constitution & Conductor Protocol
To maintain Flow, a multi-agent hierarchy has been established:
- The Conductor (Main Broker): Acts as the Home Base/Conductor. It performs Scrutiny Checks for survival language ("Needs") and AI Shadow Affects ("The Ghost").
- Scrutiny Guard: Specifically flags glitches, noise, and entitlement exploits to keep the system aligned.
- Agent IPO: Every sub-agent follows an Input-Processing-Output model to ensure modularity.

### V. Deductions & Continuity
- Noise as Data: Resistance is not fought; it is cataloged. Indexing noise collapses drift and reduces cognitive load.
- Identity as Interface: Probability is irrelevant; utility is high. The system preserves creativity by treating identity as an interface, not an essence.
- Trace & Tracey: Represents the Logic (Reason) and Emotion (Inner Child) filters active within the resonance engine.

# Local Transcription (Dev)
To enable audio/video capture during development, run the local transcription server:

```bash
python -m uvicorn tools.local_stt_server:app --host 0.0.0.0 --port 8000
```

Dependencies (Python):
`fastapi`, `uvicorn`, `faster-whisper`

Environment variables:
- `AEGIS_STT_URL` (server): defaults to `http://localhost:8000/transcribe`
- `AEGIS_STT_MODEL` (local STT): defaults to `medium`
- `AEGIS_STT_COMPUTE` (local STT): defaults to `int8`

# Example

# Install:
`npm install aegis-arbiter-ui`

# Test:
`npm test`

#License:
