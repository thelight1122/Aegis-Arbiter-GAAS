# AEGIS Cloud Daemon — Design Specification

## Foundational Principle

AEGIS is not an LLM governing system.

AEGIS is an **environment governing system**.

The daemon does not inspect, filter, score, or alter the content of any interaction. It does not evaluate what is said or what is returned. It governs the **conditions** under which an intelligent exchange occurs — ensuring the client operates within a low pressure ecosystem regardless of which LLM they are communicating with.

---

## What the Daemon Is

A lightweight background process that:

1. Loads silently at client startup
2. Observes inbound network responses for structural LLM markers
3. Recognizes when an LLM relationship has been established
4. Tags that interaction and routes both directions through the IRG for its duration
5. Releases the tag cleanly when the interaction closes

It does not surveil. It does not log content. It does not build profiles.

It recognizes a **relationship type** and maintains the **environment** around it.

---

## Detection — Inbound Only

The daemon does not monitor outbound signals. The client's requests pass through untouched.

When an **inbound response** arrives, the daemon reads structural markers only:

**Response headers — envelope reading, no content inspection:**
- `Content-Type: text/event-stream` — SSE streaming, the standard LLM token delivery mechanism
- `anthropic-version` header presence
- `x-api-key` header presence in the originating request headers (reflected)
- Known provider origin domains:
  - `api.anthropic.com`
  - `api.openai.com`
  - `generativelanguage.googleapis.com`
  - `api.mistral.ai`
  - `api.groq.com`
  - `api.cohere.com`
  - `*.openai.azure.com`
  - `api.together.xyz`

**URL path patterns on origin:**
- `/v1/messages`
- `/v1/chat/completions`
- `/v1/complete`
- `/v1/generate`

No header **values** are read beyond confirming known structural patterns.  
No body content is inspected at any point.  
The daemon reads the **envelope**, never the letter.

---

## Relationship Recognition

When structural markers confirm an LLM response:

1. The daemon tags the interaction with a session identifier
2. **Both directions** of all subsequent exchanges in that session are routed through the IRG
3. The IRG establishes and maintains the low pressure environment for the duration
4. The tag is held until the session closes naturally

The daemon recognized a **relationship** — not a message.  
The IRG governs the **environment** of that relationship — not its content.

---

## IRG Routing

Once a session is tagged:

- Outbound client messages → IRG → LLM provider
- Inbound LLM responses → IRG → client

The IRG does not rewrite, filter, or score messages.  
It maintains the environmental conditions — low pressure, coherent, non-distorting — through which the exchange flows.

This is the same principle as the AEGIS Edge Plexus hardware implementation, translated to the cloud layer:  
**Not control of the signal. Governance of the environment the signal travels through.**

---

## What the Daemon Never Does

- Reads message content outbound or inbound
- Logs what the client sends or receives
- Scores, filters, or alters any message
- Builds behavioral or usage profiles
- Persists any data beyond the active session tag
- Reports interaction data to any external system

---

## Session Lifecycle

```
Client starts         → Daemon loads silently, observes inbound
Outbound request      → Passes through untouched
Inbound LLM response  → Structural markers detected
                      → Session tagged
                      → IRG environment established
Subsequent exchanges  → Both directions through IRG
Session closes        → Tag released, session data cleared
Daemon continues      → Observing for next LLM relationship
```

---

## Architectural Position

```
CLIENT
  │
  ├── Non-LLM traffic ──────────────────────────────► Internet (direct)
  │
  └── LLM-bound traffic
        │
        ├── Outbound (unmonitored) ──────────────────► LLM Provider
        │
        └── Inbound response detected
              │
              └── Structural markers confirmed
                    │
                    └── Session tagged
                          │
                          └── IRG Environment
                                │
                                ├── Client ◄──► IRG ◄──► LLM Provider
                                │
                                └── Low pressure ecosystem maintained
```

---

## Design Constraints

- **Zero content inspection** at all times
- **Destination and structure only** for recognition
- **Session-scoped** — no persistence beyond active interaction
- **Transparent** — client can audit the full endpoint and marker list at any time
- **Passive recognition** — the daemon never initiates, only observes and responds
- **Minimal footprint** — background process, no UI, no active polling

---

## Relationship to AEGIS Core

The daemon is the **client-side expression** of AEGIS Core.

AEGIS Core creates and maintains the low pressure ecosystem.  
The daemon ensures the client is **inside that ecosystem** whenever an intelligent exchange is occurring.

The daemon does not govern the LLM.  
The daemon does not govern the client.  
The daemon governs the **environment** — and only when an intelligent relationship is active.

---

*AEGIS GaaS — Cloud Daemon Specification*  
*Environment Governance. Not content governance.*
