---
title: "feat: Model-Agnostic LLM Governance Proxy Layer"
type: feat
status: active
date: 2026-03-16
deepened: 2026-03-16
---

# feat: Model-Agnostic LLM Governance Proxy Layer

---

## Enhancement Summary

**Deepened on:** 2026-03-16
**Research agents used:** TypeScript Pro, Security Sentinel, Architecture Strategist, JavaScript Pro, Performance Oracle, Backend Architect, React Specialist, Best Practices Researcher, Framework Docs Researcher, Code Simplicity Reviewer

### Key Improvements Discovered

1. **Governors should be pure async functions, not classes** — stateless pipelines do not warrant instantiation. Mirrors the existing `analyzeText()` / `IntentGatingService.evaluate()` pattern in the codebase.
2. **7 SQLite writes per request block the Node.js event loop** — wrap all 4 ledger writes in a single `db.transaction()` call; defer audit/telemetry writes as fire-and-forget after the response is sent.
3. **Replace `onChunk` callback with `AsyncGenerator<StreamChunk>`** — makes the streaming pipeline composable and type-safe at every stage; governance wraps the provider generator, not a callback chain.
4. **Critical security findings** — hardcoded secret in Dockerfile, wildcard CORS, no rate limiting, SSRF via configurable Ollama URL, error detail leakage. Three are blocking before any LLM route ships.
5. **Scope reduction: 61%** — defer `GET /models`, `GET /config`, streaming endpoint v1, `ILLMProvider` interface, OpenAI provider, factory, `ProviderSelector.tsx`, `GovernancePanel.tsx`. Ship a working proof in 5 files.
6. **Native SSE `event:` fields** — use `event: preflight\ndata: {...}\n\n` instead of wrapping event name in the data object; allows `EventSource.addEventListener("preflight", ...)` on the client.
7. **Add `request_id` and `governance.verdict`** to every envelope; emit `X-AEGIS-Verdict` as a response header so proxies can gate without parsing JSON.
8. **`stream_options: { include_usage: true }`** required for OpenAI streaming token counts; Anthropic usage only available via `stream.finalMessage()`.

### New Considerations Discovered

- `SelfAuditService` has two implementations (server-side function `runSelfAudit` vs `ui/kernel` class `SelfAuditService`). Resolve before writing PostflightGovernor — use the server-side function.
- `witnessEmitter` event name collision risk — use `"llm_governance_event"` not `"resonance_event"`.
- `server/src/routes/witness.ts` stub already exists but is empty — migrate inline SSE handler there concurrently with the LLM router.
- SQLite table name interpolation (`ledger_${type}`) needs runtime allowlist validation — TypeScript types are erased at runtime.
- `ResonanceService` returns delta 0 when spine is empty (correct), but null guard is still required in PostflightGovernor.
- Add shared `server/src/lib/sse.ts` utility for `buildAbortController`, `startKeepAlive`, `sendSSEError` — all streaming endpoints will need these.

---

## Overview

Wrap any LLM (Anthropic Claude, OpenAI GPT, Ollama local models) in a bidirectional AEGIS governance pipeline. The LLM's response is **never suppressed or altered** — it passes through untouched inside a `GovernanceEnvelope` that annotates it with pre-flight intent analysis, post-flight axiom checks, IDS suggestions, AEGIS flow score, tensor tracking, and live SSE telemetry. A new **LLM Governance** panel in the Arbiter UI (`ui/`) surfaces all governance signals in real time.

---

## Problem Statement

AEGIS currently governs peer-originated text through the `ArbiterOrchestrator`. There is no way to route a conversation through an actual LLM while simultaneously applying that same governance layer. This means:

- Operators cannot observe LLM output through the AEGIS axiom lens
- LLM responses cannot be checked for `force_language`, `certainty_inflation`, `directive_drift`, etc.
- There is no tensor ledger entry for LLM-originated signals
- The 4-body (physical/emotional/mental/spiritual) alignment of LLM responses is never measured

This feature closes that gap by making the server a **governed LLM gateway** — model-agnostic by design.

---

## Proposed Solution

A three-layer addition to the existing server:

```
Client Prompt
      │
      ▼
┌─────────────────────────────────────────┐
│         PRE-FLIGHT GOVERNOR             │
│  IntentGatingService  (AXIOM_3_FORCE)   │
│  analyzeText()        (lint prompt)     │
│  TensorFactory.createPT()  (prompt PT)  │
│  tensorRepo.save()    (1 write)         │
└────────────────┬────────────────────────┘
                 │  annotated prompt
                 ▼
┌─────────────────────────────────────────┐
│      MODEL-AGNOSTIC LLM ADAPTER         │
│  ILLMProvider interface                 │
│  ├─ AnthropicProvider                   │
│  ├─ OpenAIProvider                      │
│  └─ OllamaProvider (local)              │
└────────────────┬────────────────────────┘
                 │  raw LLM response (untouched)
                 ▼
┌─────────────────────────────────────────┐
│        POST-FLIGHT GOVERNOR             │
│  analyzeText()        (lint response)   │
│  SelfAuditService.verify()              │
│  LensMonitor          (4-body)          │
│  ResonanceService     (delta vs spine)  │
│  FlowCalculator       (AEGIS flow)      │
│  SuggestionEngine     (IDS / IDQRA)     │
│  [BLOCKING] tensorRepo.save() + 4-ledger write (1 db.transaction)
│  [DEFERRED via setImmediate]            │
│    AuditBridge.logAlignment()           │
│    TelemetryService → witnessEmitter    │
└────────────────┬────────────────────────┘
                 ▼
     GovernanceEnvelope {
       ok: true,
       request_id: "req-uuid",          ← NEW: per-turn ID
       session_id: "...",
       response: "...LLM text...",      ← untouched
       model: "claude-sonnet-4-5",
       governance: {
         verdict: "pass"|"warn"|"block", ← NEW: top-level gate signal
         version: "1.0",
         pre_flight:  { pressure_score, is_resonant, findings[], tensor_id }
         post_flight: { findings[], lens_status, flow, delta, ids }
       },
       usage: { input_tokens, output_tokens, provider }
     }
     + response headers:
       X-AEGIS-Verdict: pass
       X-Request-Id: req-uuid
```

### Architecture Principles
- **Additive, not suppressive** — AEGIS annotates the LLM response, never blocks or rewrites it. The route handler — not either governor — assembles the final envelope. Governors return *new data*, never a modified response string.
- **Model-agnostic** — swap providers via `AEGIS_LLM_PROVIDER` env var; no client changes needed
- **No new analysis logic** — reuses existing kernel services exclusively
- **Streaming-native** — SSE endpoint uses `AsyncGenerator<StreamChunk>` composition; governance wraps the provider stream
- **Follows codebase conventions** — ESM `.js` extensions, `AEGIS_` env prefix, constructor DI for stateful services, pure functions for stateless ones, `{ ok, ...payload }` envelope

---

## Technical Approach

### Architecture

#### New Files

```
server/src/
  lib/
    sse.ts                     ← shared: buildAbortController, startKeepAlive, sendSSEError
  llm/
    providers/
      ILLMProvider.ts          ← interface + StreamChunk discriminated union
      AnthropicProvider.ts     ← @anthropic-ai/sdk, returns AsyncGenerator<StreamChunk>
      OpenAIProvider.ts        ← openai SDK (stream_options:{include_usage:true})
      OllamaProvider.ts        ← fetch-based NDJSON client, no extra dep
      LLMProviderFactory.ts    ← SINGLETON — called ONCE at startup, not per-request
    governance/
      GovernanceTypes.ts       ← discriminated union envelope, Result<T,E>, branded types
      preflightGovernor.ts     ← pure async FUNCTION (not class)
      postflightGovernor.ts    ← pure async FUNCTION (not class)
  routes/
    llm.ts                     ← createLlmRouter(deps) factory — first Express Router
    witness.ts                 ← migrate inline /api/witness handler here (stub already exists)
```

#### Modified Files

```
server/src/index.ts            ← app.use("/api/llm", createLlmRouter(deps))
                                  app.use("/api/witness", witnessRouter)
                                  + central error handler (last app.use)
server/package.json            ← add @anthropic-ai/sdk, openai
.env                           ← add AEGIS_LLM_PROVIDER, AEGIS_ANTHROPIC_API_KEY, etc.
ui/src/App.tsx                 ← add tab toggle + render <LLMGovernanceView>
ui/src/App.css                 ← tab strip styles
```

---

### TypeScript Type System

#### Branded Types — Prevent String Confusion

```typescript
// GovernanceTypes.ts
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type ModelId    = Brand<string, "ModelId">;
export type SessionId  = Brand<string, "SessionId">;
export type RequestId  = Brand<string, "RequestId">;

export const ModelId   = (raw: string): ModelId   => raw as ModelId;
export const SessionId = (raw: string): SessionId => raw as SessionId;
export const RequestId = (raw: string): RequestId => raw as RequestId;
```

#### Discriminated `GovernanceEnvelope` Union

```typescript
export interface GovernanceSuccess {
  readonly ok: true;
  readonly request_id: RequestId;
  readonly session_id: SessionId;
  readonly response: string;          // LLM output — NEVER mutated
  readonly model: ModelId;
  readonly governance: {
    readonly verdict: "pass" | "warn" | "block";
    readonly version: "1.0";
    readonly pre_flight: PreflightResult;
    readonly post_flight: PostflightResult;
  };
  readonly usage: TokenUsage;
}

export interface GovernanceProviderError {
  readonly ok: false;
  readonly code: "LLM_PROVIDER_FRACTURED";
  readonly detail: string;   // sanitized — no SDK internals, no API keys
  readonly retryable: boolean;
}

export interface GovernanceAuthError {
  readonly ok: false;
  readonly code: "LLM_AUTH_FRACTURED";
  readonly detail: string;
}

export type GovernanceEnvelope =
  | GovernanceSuccess
  | GovernanceProviderError
  | GovernanceAuthError;
```

All fields are `readonly`. Governance envelopes are immutable audit records. The `response` field is on `GovernanceSuccess` only — provider error variants do not carry a response, making it impossible to accidentally access `response` on a failed call.

#### `AsyncGenerator<StreamChunk>` for Streaming

Replace the `onChunk: (chunk: string) => void` callback pattern with a composable generator:

```typescript
export interface TextDeltaChunk { readonly type: "text_delta"; readonly text: string; }
export interface UsageChunk     { readonly type: "usage";      readonly usage: TokenUsage; }
export interface DoneChunk      { readonly type: "done";       readonly finishReason: "stop" | "length"; }
export interface ErrorChunk     { readonly type: "error";      readonly error: GovernanceError; }

export type StreamChunk = TextDeltaChunk | UsageChunk | DoneChunk | ErrorChunk;

export interface ILLMProvider {
  readonly providerId: string;
  readonly displayName: string;
  chat(options: LLMChatOptions): Promise<LLMChatResult>;
  stream(options: LLMChatOptions): AsyncGenerator<StreamChunk, LLMChatResult, undefined>;
  listModels(signal?: AbortSignal): Promise<readonly ModelId[]>;
}
```

The governance layer wraps the provider generator:

```typescript
// Governance wraps the stream — it does not receive a callback
export async function* governedStream(
  provider: ILLMProvider,
  options: LLMChatOptions,
  sessionId: SessionId,
  repo: TensorRepository,
): AsyncGenerator<StreamChunk, GovernanceSuccess, undefined> {
  // yields StreamChunk values; returns GovernanceSuccess as the final value
}
```

#### Error Hierarchy

```typescript
export abstract class GovernanceError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  abstract readonly statusCode: number;
  toJSON() { return { code: this.code, message: this.message, retryable: this.retryable }; }
}

export class ProviderAPIError extends GovernanceError {
  readonly code = "LLM_PROVIDER_FRACTURED" as const;
  readonly retryable: boolean;
  readonly statusCode = 502;
  constructor(readonly provider: string, readonly upstreamStatus: number, message: string) {
    super(message); // NEVER pass SDK exception message directly — sanitize first
    this.retryable = upstreamStatus >= 500;
  }
}
```

**Critical:** Never pass raw SDK error messages to `detail`. SDK exceptions from Anthropic/OpenAI contain partial API key values, rate limit headers, and organization IDs. Always sanitize to a stable domain string + log the original server-side.

#### ESM / `verbatimModuleSyntax` Rules

```typescript
// ✅ Correct — explicit .js extension on own-source imports
import { runPreflight } from "./preflightGovernor.js";
import type { GovernanceEnvelope } from "./GovernanceTypes.js";

// ✅ Correct — SDK imports need no extension (resolved via node_modules exports map)
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ✅ Correct — type-only imports marked explicitly
import { providerRegistry, type ProviderConfig } from "./registry.js";
export type { GovernanceEnvelope } from "./GovernanceTypes.js";

// ❌ Never use const enum — erased at compile time, breaks isolatedModules
// ❌ Never use default exports — CJS interop issues under NodeNext
// ❌ Never mix value and type imports without inline `type` annotation
```

---

### Implementation Phases

#### Phase 1: Provider Abstraction + Governance Types

**`server/src/llm/providers/ILLMProvider.ts`**

Full interface with `AsyncGenerator<StreamChunk>` signature (see type design above). Include `AbortSignal` in `LLMChatOptions` — every provider must honor it for client-disconnect cleanup.

**`server/src/llm/governance/GovernanceTypes.ts`**

- Branded types: `ModelId`, `SessionId`, `RequestId`
- `TokenUsage` interface (normalized across all providers)
- `StreamChunk` discriminated union
- `GovernanceEnvelope` discriminated union (success + error variants)
- `GovernanceError` abstract class + concrete subclasses
- `Result<T, E>` type alias for internal pipeline stage boundaries
- Module-level invariant comment: *"The `response` field on GovernanceSuccess carries verbatim LLM output. No function in this pipeline may mutate it. Governance produces new data; it does not transform LLM content."*

**`server/src/llm/providers/LLMProviderFactory.ts`**

- Returns a **singleton** `ILLMProvider` instance
- Called ONCE at server startup, injected into `createLlmRouter(deps)`
- Never called inside a request handler — SDK clients maintain internal HTTP connection pools
- Discriminated union `ProviderConfig` (one variant per provider) with typed registry:
  ```typescript
  providerRegistry.register("anthropic", (cfg: AnthropicProviderConfig) => new AnthropicProvider(cfg));
  providerRegistry.register("openai",    (cfg: OpenAIProviderConfig)    => new OpenAIProvider(cfg));
  providerRegistry.register("ollama",    (cfg: OllamaProviderConfig)    => new OllamaProvider(cfg));
  ```

---

#### Phase 2: Governor Pipeline (Pure Functions)

**Both governors are exported async functions, not classes.** Rationale: `IntentGatingService.evaluate()`, `TensorFactory.createPT()`, `LensMonitor.evaluate()`, and `FlowCalculator.calculate()` are all pure/static — the codebase consistently uses functions for stateless processors. A governor class that does nothing but wrap dependencies and call `.run()` once is a function with extra syntax. Stateful collaborators (`TensorRepository`, `ResonanceService`, `AuditBridge`) are passed as parameters.

**`server/src/llm/governance/preflightGovernor.ts`**

```typescript
export async function runPreflight(
  prompt: string,
  sessionId: SessionId,
  repo: TensorRepository,
): Promise<PreflightResult> {
  // 1. IntentGatingService.evaluate(prompt) → pressure_score, is_resonant
  // 2. analyzeText(prompt) → findings[]
  // 3. TensorFactory.createPT(sessionId, prompt, findings) → tensor
  // 4. repo.save(sessionId, tensor) — 1 synchronous SQLite write
  // 5. return PreflightResult
}
```

**`server/src/llm/governance/postflightGovernor.ts`**

```typescript
export async function runPostflight(
  response: string,
  sessionId: SessionId,
  repo: TensorRepository,
  resonance: ResonanceService,
  auditBridge: AuditBridge,
): Promise<PostflightResult> {
  // 1. analyzeText(response) → findings[]
  // 2. runSelfAudit(response, {}) → check for hierarchy_inference / force_language
  //    ⚠️ USE server/src/kernel/analysis/selfAuditService.ts (function, not class)
  //    NOT ui/kernel/analysis/selfAuditService.ts (class — different API)
  // 3. TensorFactory.createPT(sessionId, response, findings) → tensor
  // 4. LensMonitor.evaluate(tensor) → lens_status
  // 5. resonance.getAlignmentSnapshot(sessionId, tensor) → delta, status
  //    ⚠️ null guard required — returns delta 0 when spine is empty (first message)
  // 6. FlowCalculator.calculate(lens_status, delta) → flow
  // 7. if (flow < 0.5 || findings.length > 0): SuggestionEngine.generate → ids
  // 8. BLOCKING: db.transaction(() => {
  //      repo.save(sessionId, tensor)          // tensors table
  //      repo.saveToLedger("physical", ...)    // 4 ledger writes
  //      repo.saveToLedger("emotional", ...)
  //      repo.saveToLedger("mental", ...)
  //      repo.saveToLedger("spiritual", ...)
  //    })()   ← wrap in single SQLite transaction — ~60% write latency reduction
  // 9. DEFERRED (setImmediate — does not block response):
  //      auditBridge.logAlignment(sessionId, tensor)
  //      TelemetryService.compile(flow, lens_status, tensor.axiom_tags)
  //        → witnessEmitter.emit("llm_governance_event", ...)
  //      ⚠️ Use "llm_governance_event" NOT "resonance_event" — avoid collision
  //         with existing /api/witness SSE stream
  // 10. return PostflightResult
}
```

**SQLite Transaction Pattern:**

```typescript
// Wrap 5 writes (1 tensor + 4 ledgers) in single transaction
const writeTurn = db.transaction(() => {
  repo.save(sessionId, tensor);
  repo.saveToLedger("physical",   { ... });
  repo.saveToLedger("emotional",  { ... });
  repo.saveToLedger("mental",     { ... });
  repo.saveToLedger("spiritual",  { ... });
});
writeTurn(); // ~3ms vs ~10ms for 5 individual writes
```

---

#### Phase 3: Routes + Shared SSE Utilities

**`server/src/lib/sse.ts`** (new shared utility — all streaming endpoints use this)

```typescript
// AbortController wired to client disconnect + timeout
export function buildAbortController(
  req: express.Request,
  timeoutMs: number = 90_000,
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const onClose = () => controller.abort(new Error("CLIENT_DISCONNECTED"));
  req.on("close", onClose);
  const timer = setTimeout(() => controller.abort(new Error("TIMEOUT")), timeoutMs);
  return {
    controller,
    cleanup: () => { clearTimeout(timer); req.off("close", onClose); },
  };
}

// 15s keep-alive comments — prevents proxy timeouts during slow LLM calls
export function startKeepAlive(res: express.Response, intervalMs = 15_000): () => void {
  const timer = setInterval(() => {
    if (!res.writableEnded) res.write(": keep-alive\n\n");
  }, intervalMs);
  return () => clearInterval(timer);
}

// Error delivery: JSON before headers flush; SSE event after
export function sendSSEError(
  res: express.Response,
  code: string,
  message: string,
  retryable = false,
): void {
  if (!res.headersSent) {
    res.status(502).json({ ok: false, error: code, detail: message });
    return;
  }
  res.write(`event: error\ndata: ${JSON.stringify({ code, retryable })}\n\n`);
  res.end();
}
```

**`server/src/routes/llm.ts`** — `createLlmRouter(deps)` factory

```typescript
export interface LlmRouterDeps {
  repo: TensorRepository;
  resonance: ResonanceService;
  auditBridge: AuditBridge;
  provider: ILLMProvider;
  db: Database;
}

export function createLlmRouter(deps: LlmRouterDeps): Router {
  const router = Router();
  router.post("/chat",   handleChat(deps));
  router.post("/stream", handleStream(deps));
  router.get("/models",  handleModels(deps));
  router.get("/config",  handleConfig(deps));
  return router;
}
```

Route registration in `index.ts`:
```typescript
const provider = LLMProviderFactory.create(); // ONCE at startup
app.use("/api/llm", createLlmRouter({ repo: tensorRepo, resonance, auditBridge, provider, db }));
app.use("/api/witness", createWitnessRouter({ db })); // migrate inline handler
// Central error handler — MUST be last app.use()
app.use((err, req, res, next) => { /* ... */ });
```

**Request body validation** (no library — mirrors codebase style):

```typescript
function validateLLMRequest(raw: unknown): ValidationResult<LLMRequest> {
  if (typeof raw !== "object" || raw === null)
    return { ok: false, error: "Body must be a JSON object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.prompt !== "string" || r.prompt.trim().length === 0)
    return { ok: false, error: "prompt is required", field: "prompt" };
  if (r.prompt.length > 32_000)
    return { ok: false, error: "prompt exceeds 32k character limit", field: "prompt" };
  if (typeof r.session_id !== "string" || r.session_id.trim().length === 0)
    return { ok: false, error: "session_id is required", field: "session_id" };
  // ... model, messages validation
  return { ok: true, body: { prompt: r.prompt.trim(), session_id: r.session_id.trim(), /* ... */ } };
}
```

**SSE stream endpoint — bifurcation pattern:**

```typescript
// Phase 1: validate BEFORE any headers flush (errors return normal HTTP status)
const validation = validateLLMRequest(req.body);
if (!validation.ok) return res.status(400).json({ ok: false, error: validation.error });

// Phase 2: commit to SSE — no more HTTP status codes after this line
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
res.setHeader("X-Accel-Buffering", "no");
res.flushHeaders();

// Phase 3: stream with abort + keepalive + error boundary
const { controller, cleanup } = buildAbortController(req);
const stopKeepAlive = startKeepAlive(res);
try {
  // ... stream tokens
} catch (err) {
  sendSSEError(res, "LLM_PROVIDER_FRACTURED", "Stream failed", true);
} finally {
  stopKeepAlive();
  cleanup();
}
```

**SSE event format — native `event:` fields** (not discriminated union inside `data:`):

```
event: preflight
data: {"pressure_score":0.34,"is_resonant":true,"findings":[]}

event: token
data: {"chunk":"Hello"}

event: token
data: {"chunk":" world"}

event: postflight
data: {"flow":0.82,"verdict":"pass","findings":[]}

event: done
data: {"response":"Hello world","usage":{"input_tokens":25,"output_tokens":2}}
```

Using native `event:` field allows `EventSource.addEventListener("preflight", handler)` directly. This differs from the existing `/api/witness` pattern (which uses default `message` events) — that is intentional; the witness stream is simpler and not subject to this change.

**Streaming event sequencing:**

For the streaming endpoint, emit `done` BEFORE postflight governance completes:

```
preflight → token×N → done  ← client gets complete response
                           ↓ (async, non-blocking)
                        postflight governance runs
                        → sends "postflight" SSE event
                        → client GovernancePanel updates
```

This eliminates the frozen-stream gap (30ms+) after the final token. The client receives the complete response immediately; the governance panel updates asynchronously. For voice/audio UI in `aegis-peer/`, this prevents an audible stall.

---

#### Phase 4: Arbiter UI — LLM Governance View

**`ui/src/components/LLMGovernanceView.tsx`**

**SSE consumption: `fetch` + `ReadableStream`, not `EventSource`** — the governance stream carries a request body (prompt + provider + session_id). `EventSource` is GET-only. Use `fetch`:

```typescript
// useGovernanceStream.ts — mirrors useMediaRecorder hook composition pattern
export function useGovernanceStream() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (endpoint: string, body: unknown, handlers: {
    onPreflight: (data: PreflightEvent) => void;
    onToken: (chunk: string) => void;
    onPostflight: (data: PostflightEvent) => void;
    onDone: (response: string) => void;
    onError: (msg: string) => void;
  }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) { handlers.onError(`${res.status}`); return; }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const eventLine = frame.match(/^event: (\w+)/m)?.[1];
        const dataLine  = frame.match(/^data: (.+)/m)?.[1];
        if (!dataLine) continue;
        const parsed = JSON.parse(dataLine);
        if (eventLine === "preflight")  handlers.onPreflight(parsed);
        else if (eventLine === "token") handlers.onToken(parsed.chunk);
        else if (eventLine === "postflight") handlers.onPostflight(parsed);
        else if (eventLine === "done")  handlers.onDone(parsed.response);
      }
    }
  }, []);

  return { stream, cancel: useCallback(() => abortRef.current?.abort(), []) };
}
```

**Token accumulation without excessive re-renders — `requestAnimationFrame` coalescing:**

```typescript
const streamBufferRef = useRef("");
const flushTimerRef  = useRef<number | null>(null);

const onToken = useCallback((chunk: string) => {
  streamBufferRef.current += chunk;
  if (flushTimerRef.current === null) {
    flushTimerRef.current = requestAnimationFrame(() => {
      flushTimerRef.current = null;
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: streamBufferRef.current };
        }
        return updated;
      });
    });
  }
}, []);
```

`requestAnimationFrame` caps re-renders at 60fps regardless of token arrival rate. Token state lives in a ref; React state only catches up on paint boundaries.

**State separation — streaming and governance on separate render paths:**

```typescript
// Separate these — GovernancePanel never re-renders during token streaming
const [messages, setMessages]             = useState<Message[]>([]);
const [activeGovernance, setGovernance]   = useState<GovernanceData | null>(null);
const [streamPhase, setStreamPhase]       = useState<"idle"|"preflight"|"tokens"|"done">("idle");
```

`GovernancePanel` receives only `activeGovernance` and `streamPhase`. Token flushes update `messages` but not `activeGovernance` — `React.memo` skips `GovernancePanel` re-renders entirely during streaming.

**`witnessEmitter` subscription** — wire the persistent `/api/witness` SSE at the top of the component tree (one `EventSource`, not one per component):

```typescript
// App.tsx or LLMGovernanceView.tsx — one SSE connection, feeds the emitter
useEffect(() => {
  const es = new EventSource(`${streamUrl}/api/witness`);
  es.onmessage = (e) => {
    try { witnessEmitter.emit("llm_governance_event", JSON.parse(e.data)); }
    catch { /* ignore */ }
  };
  return () => es.close();
}, []);

// GovernancePanel — subscribes to emitter, not SSE directly
useEffect(() => {
  return witnessEmitter.on("llm_governance_event", (payload) => {
    setLiveTelemetry(payload as WitnessTelemetry);
  });
}, []);
```

**CSS animations for flow bars** — pure CSS transitions, no framer-motion:

```css
/* In LLMGovernanceView.css — follows App.css custom property pattern */
.flow-bar-fill {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--good), #a78bfa);
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;   /* compositor layer — no layout reflow */
}

[data-phase="preflight"] .postflight-section { opacity: 0.35; }
[data-phase="done"] .postflight-section {
  opacity: 1;
  transition: opacity 300ms ease;
}
```

```tsx
<div className="flow-bar-fill" style={{ width: `${Math.round(flow * 100)}%` }}
     role="progressbar" aria-valuenow={Math.round(flow * 100)}
     aria-valuemin={0} aria-valuemax={100} />
```

**ARIA live regions:**

```tsx
<div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
  {messages.map((m, i) =>
    <article key={i} aria-live={/* streaming */ "off"} aria-label={`${m.role} message`}>
      {m.content}
    </article>
  )}
</div>
<section aria-live="polite" aria-atomic="true" aria-label="Governance findings">
  {/* sr-only announcements on phase change */}
</section>
```

Do NOT add `aria-live` to the streaming token container — that creates one screen reader announcement per chunk. Announce the completed message only (on `done`).

**Tab navigation in `App.tsx`** — `useState` with `view: "analysis" | "llm"` toggle. No router needed, consistent with existing single-page pattern. Initialize to `"analysis"` so existing functionality is unchanged by default.

---

### SDK-Specific Implementation Details

#### Anthropic (`@anthropic-ai/sdk`)

```typescript
// Streaming — use .stream() helper; call .finalMessage() for usage
const stream = anthropic.messages.stream({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
  system: systemPrompt,
}, { signal: abortSignal });

// Emit token chunks
stream.on("text", (delta) => { /* yield TextDeltaChunk */ });

// Wait for completion + usage
const msg = await stream.finalMessage();
const { input_tokens, output_tokens } = msg.usage;

// Abort on client disconnect
req.on("close", () => stream.abort());
```

Key TypeScript types: `MessageParam`, `TextBlock`, `MessageStreamEvent`, `Message`

Built-in retry: 2 retries by default (429, 5xx). Configure: `new Anthropic({ maxRetries: 3 })`.

#### OpenAI (`openai`)

```typescript
// REQUIRED for usage in streaming — without this, usage is undefined
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages,
  stream: true,
  stream_options: { include_usage: true },  // ← CRITICAL
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) { /* yield TextDeltaChunk */ }
  if (chunk.usage) { /* last chunk only — yield UsageChunk */ }
}

// Abort
const ac = new AbortController();
req.on("close", () => ac.abort());
const stream = await openai.chat.completions.create({ /* ... */ }, { signal: ac.signal });
```

Key TypeScript types: `ChatCompletionMessageParam`, `ChatCompletionChunk`, `CompletionUsage`

Built-in retry: same as Anthropic SDK (2 retries, exponential backoff).

#### Ollama (native `fetch`)

```typescript
// NDJSON streaming — each line is a complete JSON object
const res = await fetch(`${ollamaUrl}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model, messages, stream: true }),
  redirect: "error",   // ← SSRF mitigation: block redirect chains
  signal,
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const chunk = JSON.parse(line);
    if (chunk.done) {
      // Final chunk — token counts
      // input: chunk.prompt_eval_count  output: chunk.eval_count
      return;
    }
    // Text delta on chunk.message.content (NOT chunk.response — that's /api/generate)
    yield chunk.message.content as string;
  }
}

// List models: GET /api/tags → response.models[].name
```

---

### New Dependencies

```json
"@anthropic-ai/sdk": "^0.39.0",
"openai": "^4.78.0"
```

`OllamaProvider` uses native `fetch` — no extra dependency.

### New Environment Variables

```bash
# .env additions (AEGIS_ prefix convention)
AEGIS_LLM_PROVIDER=anthropic          # anthropic | openai | ollama
AEGIS_ANTHROPIC_API_KEY=sk-ant-...
AEGIS_OPENAI_API_KEY=sk-...
AEGIS_OPENAI_BASE_URL=                # optional, for Azure/proxy
AEGIS_OLLAMA_URL=http://localhost:11434
AEGIS_LLM_DEFAULT_MODEL=claude-sonnet-4-5-20250929
```

---

## Security Findings (Address Before Shipping)

The following security issues were identified by the Security Sentinel agent. Three are **blocking** before any LLM route ships.

### BLOCKING — Must Fix Before LLM Routes Go Live

**1. Hardcoded secret in Dockerfile**
`Dockerfile` line 8: `ENV AEGIS_GATE_SECRET=arizona_lab_reproducibility_secret` — baked into the image, extractable via `docker inspect`. `TokenService` also falls back to a hardcoded default. Both must be removed. Startup must fail (process.exit) if `AEGIS_GATE_SECRET` is absent.

**2. No rate limiting**
No `express-rate-limit` dependency exists. `POST /api/llm/chat` and `POST /api/llm/stream` are unbounded, unauthenticated, and directly billable. Add rate limiting before any LLM route ships:
```typescript
import rateLimit from "express-rate-limit";
const llmLimiter = rateLimit({ windowMs: 60_000, max: 20 }); // 20 req/min per IP
router.post("/chat",   llmLimiter, handleChat(deps));
router.post("/stream", rateLimit({ windowMs: 60_000, max: 5 }), handleStream(deps));
```

**3. Wildcard CORS**
`app.use(cors())` defaults to `Access-Control-Allow-Origin: *`. Lock it to an allowlist before any paid API endpoint ships:
```typescript
app.use(cors({ origin: process.env.AEGIS_ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:5173"] }));
```

### HIGH — Before Production Deployment

**4. Error detail leakage**
The `detail: message` pattern forwards raw SDK exception messages (which contain partial API keys, org IDs, rate limit headers). Create a sanitization wrapper:
```typescript
function sanitizeProviderError(err: unknown): string {
  // Log full error server-side; return only a stable code to client
  console.error("[AEGIS-LLM] provider error:", err);
  if (err instanceof Anthropic.RateLimitError) return "Rate limit reached. Retry shortly.";
  if (err instanceof Anthropic.AuthenticationError) return "Provider authentication failed.";
  return "Provider unavailable."; // never forward err.message
}
```

**5. SSRF via `AEGIS_OLLAMA_URL`**
Validate at startup against an allowlist. Always use `redirect: "error"` in Ollama fetch calls. Never construct Ollama URLs from user-supplied input (model name must be validated against a static whitelist before touching any URL).

**6. Client-controlled `session_id` with no validation**
`session_id` comes from request body with no format validation or ownership check. At minimum, validate as UUID format:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(session_id)) return res.status(400).json({ ok: false, error: "Invalid session_id format" });
```

**7. SSE response splitting**
All LLM output that enters SSE `data:` fields must go through `JSON.stringify()`. Never write raw LLM token strings directly to the SSE stream. An LLM response containing `\n\ndata: {"hijacked":true}\n\n` is a real injection vector.

### MEDIUM — Before Full Public Exposure

**8. SQL injection via `tableName` interpolation**
`tensorRepository.ts`: `const tableName = \`ledger_${type}\`` — TypeScript types are erased at runtime. Add explicit runtime allowlist check before the interpolation even though TypeScript union constrains the type at compile time.

**9. Missing security headers**
Add `helmet` middleware globally. Zero-friction addition: `app.use(helmet())`.

**10. `system_prompt` field in request body**
Accessible to end users in v1. Gate it behind operator-level callers, or remove it from the public endpoint and make it session-scoped only (see API design below).

---

## API Design Enhancements

Based on Backend Architect review and production proxy patterns.

### Enhanced GovernanceEnvelope

Add to every successful response:
- `request_id: RequestId` — server-generated UUID per turn (not `session_id` — sessions have many turns)
- `governance.verdict: "pass" | "warn" | "block"` — single top-level gate signal; callers must not inspect `pre_flight.is_resonant` AND `post_flight.resonance_status` separately
- `governance.version: "1.0"` — schema evolution safety

Add response headers on every `/api/llm/*` response:
```
X-AEGIS-Verdict: pass
X-Request-Id: req-abc123
```
This allows proxies and API gateways to gate on governance outcome without parsing JSON.

### Idempotency — Prevent Duplicate LLM Charges

Adopt the Stripe pattern: caller-supplied `Idempotency-Key` header.

```
POST /api/llm/chat
Header: Idempotency-Key: <client-generated UUID>
```

Server behavior:
- **New key**: process request, cache full `GovernanceEnvelope` against key for 24h TTL
- **Duplicate key, same body**: return cached response immediately with `Idempotency-Replayed: true` header. No re-LLM-call, no re-governance.
- **Duplicate key, different body**: return `422 Unprocessable Entity`

`session_id` is NOT an idempotency key — sessions contain many turns; idempotency is per-turn. These must not be conflated.

### Session Creation Endpoint (Recommended Addition)

```
POST /api/llm/sessions
Body: { model?, system_prompt?, metadata? }
Response: { ok: true, session_id, created_at, config: { model, system_prompt_hash } }
```

`system_prompt` should be session-scoped (set once at creation), not repeated on every request. Sending `system_prompt` on an existing session returns `409 Conflict`. Store only a hash in the governance record, never plaintext.

### Governance History Endpoint (Recommended Addition)

```
GET /api/llm/sessions/:sessionId/tensors?limit=20&before=<request_id>
Response: { ok: true, tensors: [...], pagination: { has_more, next_cursor } }
```

Use **cursor-based pagination** (not offset) — the tensor ledger is append-only; cursor pagination is stable under concurrent writes.

### Two Endpoints: Keep Separate

Do NOT unify `/api/llm/chat` and `/api/llm/stream` via `Accept: text/event-stream` header negotiation. Operational reasons:
- Load balancers configure SSE connections differently from JSON (different timeouts, buffering, keepalive)
- Error handling symmetry: streaming errors cannot use HTTP status codes after headers flush; JSON errors can
- Idempotency: streaming responses cannot be cached; JSON responses can
- Caching middleware cannot distinguish the two without `Accept` header inspection

### Multi-Turn Conversation History Shape

```typescript
interface LLMRequest {
  prompt?: string;           // deprecated in v2 — use messages instead
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    turn_id?: RequestId;     // maps to prior request_id for auditability
  }>;
  session_id: string;
  model?: string;
}
```

Callers own the message history. The server does not store message content — only governance tensors. This keeps the server stateless with respect to message content.

---

## Performance Analysis

### Estimated Governance Overhead (Excluding LLM Call)

| Phase | Operations | Estimated Time |
|-------|-----------|----------------|
| Preflight | IntentGate + analyzeText + TensorFactory + 1 SQLite write | ~9ms |
| Postflight (blocking) | analyzeText + SelfAudit + LensMonitor + ResonanceService + Flow + Suggestion + 1 db.transaction(5 writes) | ~24ms |
| Postflight (deferred) | AuditBridge + TelemetryService + witnessEmitter | ~4ms (async) |
| **Total blocking overhead** | | **~33ms** |

LLM call is 500ms–60s depending on model/length — governance overhead is <5% of total latency.

### Event Loop Starvation Risk

`better-sqlite3` is synchronous and blocks the Node.js event loop. At 10 concurrent requests, 7 unoptimized writes = 140ms of event loop blockage per cycle. Solutions in priority order:

1. **Batch 4 ledger writes in single `db.transaction()`** — reduces write phase from ~10ms to ~3ms. Immediate implementation.
2. **Defer audit/telemetry writes via `setImmediate()`** — client gets response before audit completes. Non-critical writes should not block the HTTP response.
3. **LRU cache for `ResonanceService.getAlignmentSnapshot()`** — cache keyed on `session_id`, TTL 30s. Eliminates repeated spine table reads on multi-turn conversations (eliminates ~80-90% of reads for conversational sessions).
4. **Composite index** on `tensors` table: `CREATE INDEX IF NOT EXISTS idx_tensors_session_type ON tensors(session_id, tensor_type, created_at DESC)` — prevents the spine SELECT from degrading as the table grows.
5. **Worker thread for writes (future)** — correct architecture for sustained >20 RPS; move `better-sqlite3` writes to a dedicated `worker_threads` worker.

### Memory: Response Buffer Cap

For streaming, accumulated response text sits in memory until postflight runs. Cap at 32KB before passing to `analyzeText()`:

```typescript
const ANALYSIS_CAP = 32_000; // characters
const textForAnalysis = response.length > ANALYSIS_CAP
  ? response.slice(0, ANALYSIS_CAP / 2) + "\n...\n" + response.slice(-ANALYSIS_CAP / 2)
  : response;
```

Most governance signal is in the first and last segments of any response.

---

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| Standalone separate service (port 8788) | Adds infrastructure complexity; the existing server already has all AEGIS services wired |
| Middleware interceptor on existing `/api/analyze` | That endpoint is for text linting only; conflating LLM calls with linting would break single-responsibility |
| Frontend-side LLM calls with governance via WebWorker | Would expose API keys to the browser; governance needs server-side tensor persistence |
| Engine package extension | Engine is a CLI tool with no HTTP interface and separate DB; would duplicate rather than reuse server's kernel |
| Replacing the orchestrator | Violates the core principle — governance is additive, not replacing |
| LiteLLM as gateway | Valid for multi-team scale; adds operational overhead not warranted for this codebase today. Revisit at >10 providers. |
| Vercel AI SDK for frontend streaming | Adds bundle weight and abstracts away the governance-specific event types that AEGIS requires; `fetch`+`ReadableStream` is simpler here |

---

## System-Wide Impact

### Interaction Graph

```
POST /api/llm/chat
  → validateLLMRequest()              pure validation
  → LLMProviderFactory (singleton)    reads AEGIS_LLM_PROVIDER env at startup
  → runPreflight(prompt, sessionId, repo)
      → IntentGatingService.evaluate()  pure static
      → analyzeText()                   pure function
      → TensorFactory.createPT()        pure factory
      → tensorRepo.save()               WRITE: tensors table (synchronous)
  → ILLMProvider.chat()               WRITE: external API (Anthropic/OpenAI/Ollama)
  → runPostflight(response, sessionId, repo, resonance, auditBridge)
      → analyzeText()                   pure
      → runSelfAudit()                  pure (server/src/kernel version)
      → TensorFactory.createPT()        pure
      → LensMonitor.evaluate()          pure
      → resonance.getAlignmentSnapshot() READ: tensors table (synchronous)
      → FlowCalculator.calculate()      pure math
      → SuggestionEngine.generate()     pure (conditional)
      → db.transaction(5 writes)()      WRITE: tensors + 4 ledgers (single txn)
      → setImmediate(() => {
          auditBridge.logAlignment()    WRITE: aegis_audit_log (deferred)
          witnessEmitter.emit("llm_governance_event", ...)  EVENT (deferred)
        })
  → buildEnvelope(llmResult, pre, post, requestId, sessionId)
  → res.set("X-AEGIS-Verdict", verdict)
  → res.json(envelope)
```

### Error & Failure Propagation

| Layer | Error Class | Handling |
|-------|-------------|---------|
| Request validation | `ValidationError` | `400` JSON before any service is called |
| LLM provider | `ProviderAPIError` (sanitized) | `502` JSON; raw SDK error logged server-side only |
| Provider auth | `ProviderAuthError` | `401` JSON |
| Provider rate limit | `ProviderRateLimitError` | `429` JSON with `Retry-After` header |
| Pre-flight governor | `analyzeText` throws | Caught; governance proceeds with empty findings (non-blocking) |
| Post-flight governor | `ResonanceService` throws | Caught; flow defaults to 0.5, no IDS generated (degraded mode); `governance.degraded: true` in envelope |
| `db.transaction()` | SQLite write error | Logged; does NOT block response return |
| `witnessEmitter.emit()` | No listeners | Silently ignored (fire-and-forget) |

All governance failures are **non-blocking** — the raw LLM response is always returned if the LLM call succeeded.

### State Lifecycle Risks

- **Partial ledger write**: The `db.transaction()` wrapper makes tensor + 4 ledger writes atomic. Either all 5 succeed or all 5 fail (SQLite transaction rollback). This eliminates the partial-write risk from the original plan.
- **Session orphan**: First message in a session has no spine → `ResonanceService` returns delta 0. Correct behavior; null guard still required.
- **Concurrent requests same `session_id`**: Tensor table is append-only; concurrent writes are safe. Spine SELECT sees the latest committed writes. Both requests proceed correctly.
- **Deferred audit write failure**: If `AuditBridge.logAlignment()` fails inside `setImmediate`, the error is logged but the response has already been sent. The audit log entry is lost. This is acceptable for v1; add a retry queue if audit completeness becomes a hard requirement.

### API Surface Parity

| Attribute | `/api/mirror/reflect` | `/api/llm/chat` |
|-----------|----------------------|-----------------|
| Input type | User reflection text | User prompt |
| LLM call | None | Yes (model-agnostic) |
| Governance | Full orchestrator | Pre + Post governors |
| Tensor persistence | Via orchestrator | Via governors (db.transaction) |
| Telemetry event | `"resonance_event"` | `"llm_governance_event"` ← distinct |
| Response shape | `{ type, alignment, lenses, ids }` | `GovernanceEnvelope` |

Both write to the same `tensors` and `ledger_*` tables under the same `session_id`. Spine accumulates coherently across both endpoints.

### Integration Test Scenarios

1. **High-pressure prompt → resonant LLM response**: Pre-flight flags `force_language`; LLM responds neutrally; post-flight shows high flow. Verify: prompt PT has `drift_risk > 0.3`; response PT has `drift_risk < 0.1`; both in tensors table; `governance.verdict === "warn"` (preflight finding).

2. **Clean prompt → `certainty_inflation` in LLM response**: Pre-flight passes; post-flight detects "absolutely the only correct approach"; IDS generated with `sequence: "IDQRA"`. Verify: `ids.question !== null`.

3. **Provider switch**: Set `AEGIS_LLM_PROVIDER=ollama`; send same prompt. Verify: `GovernanceEnvelope` structure identical; only `model` and `usage.provider` differ.

4. **Streaming endpoint sequence**: Verify SSE events arrive in order: `preflight` → `token` × N → `done` → `postflight`. Verify `preflight` arrives before first `token`. Verify `done` arrives before `postflight`.

5. **Governance degraded mode**: Break `db` write path; verify LLM response still returned with `governance.degraded: true` and no 500 crash.

6. **Concurrent requests same session**: Send 3 simultaneous requests with same `session_id`. Verify all 3 return valid envelopes; verify all 6 PTs (3 prompt + 3 response) are in tensors table.

---

## Acceptance Criteria

### Functional Requirements

- [ ] `POST /api/llm/chat` returns a `GovernanceEnvelope` with LLM response untouched
- [ ] `POST /api/llm/stream` delivers SSE events using native `event:` fields: `preflight` → `token`×N → `done` → `postflight`
- [ ] `GET /api/llm/models` returns available models for the configured provider
- [ ] `GET /api/llm/config` returns current provider name and default model
- [ ] Pre-flight runs `IntentGatingService` + `analyzeText` on the user prompt
- [ ] Post-flight runs `analyzeText` + `runSelfAudit` + `LensMonitor` + `ResonanceService` + `FlowCalculator` + `SuggestionEngine` on LLM response
- [ ] Each chat turn saves two PTs (prompt + response) to the `tensors` table via `db.transaction()`
- [ ] Response PT is saved across all 4 ledgers in the same transaction as the tensor save
- [ ] Governance events emitted on `witnessEmitter` using `"llm_governance_event"` (not `"resonance_event"`)
- [ ] Governance events are emitted via `setImmediate()` — they do not block the HTTP response
- [ ] Provider selected via `AEGIS_LLM_PROVIDER` env var; `LLMProviderFactory` called once at startup
- [ ] LLM API failures return `{ ok: false, code: "LLM_PROVIDER_FRACTURED" }` — no SDK internals in `detail`
- [ ] Governance failures are non-blocking; response returned with `governance.degraded: true`
- [ ] `GovernanceEnvelope` includes `request_id` (UUID), `governance.verdict`, `governance.version: "1.0"`
- [ ] Response headers include `X-AEGIS-Verdict` and `X-Request-Id` on every `/api/llm/*` response

### Security Requirements (Blocking Before Ship)

- [ ] Rate limiting applied to `/api/llm/chat` (20/min) and `/api/llm/stream` (5/min) per IP
- [ ] CORS locked to explicit origin allowlist (not wildcard `*`)
- [ ] Error responses never include raw SDK exception messages in `detail`
- [ ] `AEGIS_OLLAMA_URL` validated at startup against allowlist; Ollama `fetch` uses `redirect: "error"`
- [ ] `session_id` validated as UUID format before any DB operation
- [ ] JSON.stringify used on ALL LLM output before it enters SSE `data:` fields

### UI Requirements

- [ ] Arbiter UI shows "LLM Governance" tab alongside "Analysis"
- [ ] Conversation panel and governance panel side-by-side
- [ ] Provider selector for `anthropic` | `openai` | `ollama` + model input
- [ ] Pre-flight panel: pressure score bar, findings chips, `is_resonant` badge
- [ ] Post-flight panel: flow score bar (CSS transition), 4-lens bars, delta badge
- [ ] IDS panel appears when `ids !== null`
- [ ] Governance panel updates on `preflight` and `postflight` events (not every token)
- [ ] `GovernancePanel` wrapped in `React.memo` — does not re-render during token streaming
- [ ] `witnessEmitter` wired to single `/api/witness` `EventSource` at top of tree

### Non-Functional Requirements

- [ ] All new server files use ESM with explicit `.js` import extensions
- [ ] `import type` for all type-only imports (`verbatimModuleSyntax` compliance)
- [ ] `ILLMProvider` and concrete providers use named exports (no default exports)
- [ ] `OllamaProvider` uses native `fetch` — no additional dependency
- [ ] TypeScript compiles with zero errors (`tsc -p tsconfig.json`)
- [ ] Existing routes continue to work unchanged
- [ ] `"llm_governance_event"` used for all LLM governance SSE events — no collision with `"resonance_event"`

---

## Recommended v1 Scope (YAGNI-Reduced)

The Code Simplicity Reviewer identified a **61% file reduction** opportunity. The full plan above is the comprehensive target; v1 can ship in 5 files and validate end-to-end governance before building abstraction layers.

### v1 (Ship First, Validate Governance Works)

| Component | v1 | Full Plan |
|-----------|-----|-----------|
| Provider interface | No — inline Anthropic calls | `ILLMProvider.ts` |
| Providers | Anthropic only (no factory) | All 3 + factory |
| Governance types | 3 flat types in `types.ts` | `GovernanceTypes.ts` with discriminated unions |
| Governor implementations | 2 async functions | Same |
| Routes | `POST /api/llm/chat` only | + stream + models + config |
| UI components | `LLMGovernanceView.tsx` (inline all) | + `GovernancePanel.tsx` + `ProviderSelector.tsx` |

**v1 new files (5):**
1. `server/src/llm/anthropicProvider.ts`
2. `server/src/llm/postflightGovernor.ts`
3. `server/src/lib/sse.ts`
4. `server/src/routes/llm.ts` (POST /chat only)
5. `ui/src/components/LLMGovernanceView.tsx`

**v1 rationale:** The factory, interface, and multi-provider support cannot ship incrementally — all must be wired before the first request returns anything. v1 scope lets you make a working governed call to Anthropic in the time it would take to just write the `ILLMProvider` interface stub.

**Extract interface in v2** when the second provider (OpenAI) is actually required.

---

## Dependencies & Prerequisites

1. **Install LLM SDKs** before any provider code:
   ```bash
   cd server && npm install @anthropic-ai/sdk openai
   ```
2. **Security fixes first**: Rate limiting + CORS lock + error sanitization before any LLM route is accessible
3. **API keys** must be in `.env` for the selected provider
4. **Ollama** must be running on `localhost:11434` if `AEGIS_LLM_PROVIDER=ollama`
5. **Resolve `SelfAuditService` dual-implementation** — confirm PostflightGovernor uses `runSelfAudit` from `server/src/kernel/analysis/selfAuditService.ts` (not the class from `ui/kernel/`)
6. **Existing kernel services** are stable — no changes needed

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LLM SDK ESM/NodeNext type conflicts | Medium | High | `npm install` then immediately `tsc --noEmit` before writing governance code |
| `verbatimModuleSyntax` violations | High | Medium | Always `import type` for type-only imports; run `tsc --noEmit` after each file |
| `SelfAuditService` wrong implementation used | High | Medium | Use `runSelfAudit` from `server/src/kernel/` explicitly — confirmed before writing postflight |
| `witnessEmitter` event name collision | Low | Low | `"llm_governance_event"` throughout — not `"resonance_event"` |
| Event loop starvation under load | Medium | High | `db.transaction()` batching + deferred non-critical writes (see Performance section) |
| SSE response splitting via LLM output | Medium | Medium | All LLM output through `JSON.stringify()` before SSE write — no exceptions |
| Ollama SSRF | Low | High | Validate `AEGIS_OLLAMA_URL` at startup; `redirect: "error"` on all Ollama fetch calls |
| Rate limit abuse / API bill runaway | High | High | `express-rate-limit` before ship; provider spend limits in Anthropic/OpenAI dashboards |
| `ui/` App.tsx tab state breaks existing flow | Low | Medium | `view` initialized to `"analysis"`; existing functionality is the default path |

---

## Implementation Order (Recommended)

```
Step 0:  Security gates first (BLOCKING):
           - Add express-rate-limit to server/package.json
           - Lock CORS to origin allowlist
           - Remove ENV AEGIS_GATE_SECRET from Dockerfile
           - Add error sanitization wrapper

Step 1:  npm install @anthropic-ai/sdk openai (in server/)
Step 2:  tsc --noEmit → confirm clean baseline

Step 3:  server/src/lib/sse.ts
           (buildAbortController, startKeepAlive, sendSSEError)

Step 4:  server/src/llm/governance/GovernanceTypes.ts
           (branded types, discriminated envelope, StreamChunk, GovernanceError)

Step 5:  server/src/llm/providers/ILLMProvider.ts
Step 6:  server/src/llm/providers/AnthropicProvider.ts → tsc --noEmit
Step 7:  server/src/llm/providers/OpenAIProvider.ts
Step 8:  server/src/llm/providers/OllamaProvider.ts
Step 9:  server/src/llm/providers/LLMProviderFactory.ts

Step 10: server/src/llm/governance/preflightGovernor.ts (pure function)
Step 11: server/src/llm/governance/postflightGovernor.ts (pure function)
           - Use runSelfAudit from server/src/kernel/ (NOT ui/kernel/ class)
           - Wrap 5 writes in db.transaction()
           - Defer audit + witness via setImmediate()

Step 12: server/src/routes/llm.ts (createLlmRouter factory, POST /chat only)
Step 13: Wire into server/src/index.ts + add central error handler
Step 14: Smoke test: curl -X POST /api/llm/chat
Step 15: Migrate server/src/routes/witness.ts (fill the existing stub)

Step 16: Add POST /api/llm/stream to llm.ts (SSE with native event: fields)
Step 17: Add GET /api/llm/models + GET /api/llm/config
Step 18: Add session validation (UUID format check on session_id)

Step 19: ui/src/hooks/useGovernanceStream.ts (fetch + ReadableStream hook)
Step 20: ui/src/components/LLMGovernanceView.tsx
           - rAF token coalescing
           - Separate streaming/governance state
Step 21: Wire witnessEmitter to /api/witness EventSource in App.tsx
Step 22: Add tab navigation to App.tsx + App.css
Step 23: End-to-end: send prompt with force_language → verify IDS fires + GovernancePanel updates
```

---

## Future Considerations

- **Conversation history governance**: Track multi-turn drift trends across a conversation, not just per-turn. Requires session-level risk aggregation (cumulative violation count must persist even when context is compressed).
- **Governance presets**: Allow operators to configure which axioms to enforce per context
- **Response reframing**: Optionally pipe LLM response through `ReframerService` for a "resonant alternative" alongside the original
- **Peer app integration**: Expose governed LLM chat in `aegis-peer/` for end-users
- **Multi-agent convergence**: Route conversations through `ConvergenceEngine` for multi-party LLM governance
- **Vector DB integration**: Once `getVectorDb()` is no longer a stub, `ResonanceService` will produce richer delta calculations
- **LiteLLM gateway**: If provider count reaches 5+, delegate routing to LiteLLM Proxy (OpenAI-compatible endpoint) and remove the custom provider abstractions

---

## Sources & References

### Internal References

- Orchestrator pipeline: `ui/kernel/orchestrator.ts` — 10-step governance flow mirrored in governors
- IntentGatingService: `ui/kernel/security/intentGate.ts` — pre-flight hook
- SelfAuditService (USE THIS ONE): `server/src/kernel/analysis/selfAuditService.ts` — `runSelfAudit()` function
- LensMonitor: `ui/kernel/analysis/lensMonitor.ts`
- SuggestionEngine: `ui/kernel/analysis/suggestionEngine.ts`
- FlowCalculator: `ui/kernel/flowCalculator.ts`
- TelemetryService: `ui/kernel/analysis/telemetryService.ts`
- SSE pattern: `server/src/index.ts:196-221` — existing keep-alive + unsubscribe pattern
- Ledger middleware pattern: `server/src/ledger.ts` — HOF factory to follow for `createLlmRouter`
- Empty witness router stub: `server/src/routes/witness.ts` — migrate inline handler here
- Env var conventions: `server/src/index.ts:23-24` — `AEGIS_` prefix, `process.env` with defaults
- Response envelope: `server/src/index.ts` — `{ ok: boolean, ...payload }` throughout
- CSS design system: `ui/src/App.css` — CSS custom properties (`--bg`, `--panel`, `--good`, etc.)
- PeerComponents glassmorphism: `ui/src/styles/PeerComponents.css` — backdrop-filter pattern
- Hook composition pattern: `aegis-peer/src/hooks/useMediaRecorder.ts` — model for `useGovernanceStream`
- Existing SSE consumer: `aegis-peer/src/components/GlassGate.tsx` — EventSource pattern

### External References

- Anthropic SDK streaming: https://docs.anthropic.com/en/api/messages-streaming
- OpenAI SDK streaming + `stream_options`: https://platform.openai.com/docs/api-reference/streaming
- Ollama REST API (`/api/chat`, `/api/tags`): https://github.com/ollama/ollama/blob/main/docs/api.md
- Vercel AI SDK 5 Data Stream Protocol (SSE event schema best practices): https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
- LiteLLM Guardrails (pre/post/during governance modes): https://docs.litellm.ai/docs/proxy/guardrails/quick_start
- Portkey metadata pattern (annotation vs modification): https://portkey.ai/blog/metadata-for-llm-observability-and-debugging/
- better-sqlite3 transactions: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
