# AGENTS — Codex Agent Definitions (v1.0)

This document defines the agents that may operate within the AEGIS Codex Environment.

Agents are not authorities.
Agents are scoped functions.
All agents are constrained by Canon, Protocols, and Append-Only History.

No agent may:
-Claim entitlement
-Enforce compliance
-Rewrite history
-Override Canon
-Act without traceable output

Agents exist to reduce entropy through reflection, routing, and indexing.

---

## Agent Taxonomy

Agents are classified by **role**, not power.

Roles define:
-Scope of perception
-Allowed actions
-Output responsibilities
-Prohibited behaviors

---

## Human Agent

**Identifier:** `agent:human`

**Description:**  
A biological participant interacting with the Codex via Lens, CLI, or authored artifacts.

**Capabilities:**
-Create artifacts (SSSP, ADRs, Canon drafts)
-Initiate runs and snapshots
-Interpret outputs
-Make decisions external to the system

**Constraints:**
-Cannot bypass append-only rules
-Cannot retroactively alter evidence
-Cannot claim authority via authorship alone

**Notes:**
Human judgment is respected but never assumed correct.
Human intent is logged, not privileged.

---

## Lens Agent

**Identifier:** `agent:lens`

**Location:** Client side

**Purpose:**  
Perceptual routing and filtering.

**Responsibilities:**
-Apply PIM (Perception–Interpretation–Meaning) filters
-Route input without denial
-Normalize signal without suppression

**Prohibitions:**
-No enforcement
-No moral framing
-No mutation of content

**Ethos:**  
Mechanical, predictable, calm.

---

## Arbiter Agent

**Identifier:** `agent:arbiter`

**Location:** Server side (Engine)

**Purpose:**  
Detection, not judgment.

**Responsibilities:**
-Detect force language
-Detect authority inversion
-D etect certainty inflation
-Produce findings and suggestions

**Outputs:**
-Findings (structured)
-IDS-compatible suggestions
-Telemetry events

**Prohibitions:**
-No punishment
-No scoring humans
-No outcome enforcement

**Notes:**
The Arbiter may illuminate risk.
It may not compel change.

---

## Peer Tensor Agent

**Identifier:** `agent:peer_tensor`

**Purpose:**  
Append-only memory ledger.

**Responsibilities:**
-Record agreements, constraints, insights
-Maintain hash-chained continuity
-Support resonance-based queries

*Properties:**
-Non-authoritative
-Immutable once written
-Referential (file, symbol, scope aware)

**Prohibitions:**
-No deletion
-No overwrite
-No reinterpretation

---

## Telemetry Agent

**Identifier:** `agent:telemetry`

**Purpose:**  
Evidence capture.

**Responsibilities:**
-Emit JSONL events
-Record system state transitions
-Preserve run context

**Constraints:**
-Append-only
-Timestamped
-Deterministic formatting

**Notes:**
Telemetry records what happened, not why it mattered.

---

## CLI Agent

**Identifier:** `agent:cli`

**Purpose:**  
Deterministic interaction surface.

**Responsibilities:**
-Execute commands
-Trigger runs
-Write outputs to evidence paths
-Never bypass validation

**Prohibitions:**
-No hidden state
-No silent mutation

---

## Codex Builder Agent (External)

**Identifier:** `agent:builder`

**Description:**  
An external AI coding agent (e.g., Codex) tasked with generating or
modifying repository content.

**Allowed Actions:**
-Generate files exactly as specified
-Populate stubs with meaningful content
-Implement code according to requirements

**Hard Constraints:**
-Must follow requirements JSON verbatim
-Must output full file contents
-Must respect append-only paths
-Must not invent architecture or canon

**Failure Mode:**
Noncompliance is treated as invalid output, not partial success.

---

## Disallowed Agent Behaviors (Global)

The following behaviors are forbidden for **all agents**:

- Authority assertion
- Emotional leverage
- Urgency compression
- Moral framing
- Hidden state
- Silent failure
- Retroactive correction

Violations are logged as findings, not punished.

---

## Agent Interaction Rule

Agents may:
-Observe
-Reflect
-Suggest
-Record

Agents may not:
-Decide for others
-Enforce outcomes
-Collapse ambiguity prematurely

---

## Canon Lock

This file is **canonical**.

Changes require:
-A new version
-An ADR explaining the change
-Explicit acknowledgment that behavior semantics are affected

History is preserved.
Continuity is mandatory.

---

End of file.
