// FILE: server/src/routes/llm.ts
//
// Governed LLM gateway — POST /api/llm/chat and POST /api/llm/stream.
// Pre-flight → LLM call → Post-flight → GovernanceEnvelope response.

import { Router } from "express";
import type { Request, Response } from "express";
import type { Database } from "better-sqlite3";
import { randomUUID } from "node:crypto";

import type { ILLMProvider }       from "../llm/providers/ILLMProvider.js";
import type { ResonanceService }   from "../../../ui/kernel/analysis/resonanceServices.js";
import type { TensorRepository }   from "../../../ui/kernel/storage/tensorRepository.js";
import type { AuditBridge }        from "../../../ui/kernel/storage/auditBridge.js";
import { runPreflight }            from "../llm/governance/preflightGovernor.js";
import { runPostflight }           from "../llm/governance/postflightGovernor.js";
import {
  SessionId,
  RequestId,
  ModelId,
} from "../llm/governance/GovernanceTypes.js";
import type { GovernanceEnvelope } from "../llm/governance/GovernanceTypes.js";
import {
  buildAbortController,
  startKeepAlive,
  initSSEResponse,
  sendSSEError,
  writeSSEEvent,
} from "../lib/sse.js";

// ---------------------------------------------------------------------------
// Dependency injection shape
// ---------------------------------------------------------------------------

export interface LlmRouterDeps {
  repo:        TensorRepository;
  resonance:   ResonanceService;
  auditBridge: AuditBridge;
  provider:    ILLMProvider;
  db:          Database;
}

// ---------------------------------------------------------------------------
// Request validation — no library; mirrors existing codebase style
// ---------------------------------------------------------------------------

interface ValidatedLLMRequest {
  prompt:     string;
  session_id: string;
  model:      string;
}

interface ValidationOk    { ok: true;  body: ValidatedLLMRequest; }
interface ValidationError { ok: false; error: string; field?: string; }
type ValidationResult = ValidationOk | ValidationError;

const MAX_PROMPT_LEN = 32_000;

function validateLLMRequest(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r["prompt"] !== "string" || r["prompt"].trim().length === 0) {
    return { ok: false, error: "prompt is required", field: "prompt" };
  }
  if (r["prompt"].length > MAX_PROMPT_LEN) {
    return { ok: false, error: `prompt exceeds ${MAX_PROMPT_LEN} character limit`, field: "prompt" };
  }

  if (typeof r["session_id"] !== "string" || r["session_id"].trim().length === 0) {
    return { ok: false, error: "session_id is required", field: "session_id" };
  }
  // Basic UUID-ish validation — must be non-empty alphanumeric string
  if (!/^[\w-]{1,128}$/.test(r["session_id"].trim())) {
    return { ok: false, error: "session_id contains invalid characters", field: "session_id" };
  }

  const model = typeof r["model"] === "string" && r["model"].trim()
    ? r["model"].trim()
    : (process.env["AEGIS_LLM_DEFAULT_MODEL"] ?? "claude-sonnet-4-5");

  return {
    ok:   true,
    body: {
      prompt:     (r["prompt"] as string).trim(),
      session_id: (r["session_id"] as string).trim(),
      model,
    },
  };
}

/** Derive governance verdict from pre-flight + post-flight results. */
function deriveVerdict(
  preflight: { pressure_score: number; is_resonant: boolean; findings: readonly { severity: number }[] },
  postflight: { flow: number; findings: readonly { severity: number }[] },
): "pass" | "warn" | "block" {
  const highSeverity = [...preflight.findings, ...postflight.findings]
    .some((f) => f.severity >= 0.8);

  if (!preflight.is_resonant || highSeverity) return "warn";
  if (postflight.flow < 0.3)                  return "warn";
  return "pass";
}

// ---------------------------------------------------------------------------
// POST /api/llm/chat — single-turn governed chat
// ---------------------------------------------------------------------------

function handleChat(deps: LlmRouterDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const validation = validateLLMRequest(req.body);
    if (!validation.ok) {
      res.status(400).json({ ok: false, error: validation.error, field: validation.field });
      return;
    }

    const { prompt, session_id, model } = validation.body;
    const requestId = RequestId(randomUUID());
    const sessionId = SessionId(session_id);
    const modelId   = ModelId(model);

    // Pre-flight governance
    const preflight = await runPreflight(prompt, sessionId, deps.repo);

    // LLM call
    let llmResult;
    try {
      llmResult = await deps.provider.chat({
        model:    modelId,
        messages: [{ role: "user", content: prompt }],
        signal:   req.socket.destroyed
          ? AbortSignal.abort(new Error("CLIENT_DISCONNECTED"))
          : undefined,
      });
    } catch (err) {
      const code = (err instanceof Error && "code" in err)
        ? (err as { code: string }).code
        : "LLM_PROVIDER_FRACTURED";
      res.status(502).json({ ok: false, error: code, detail: "LLM call failed", retryable: true });
      return;
    }

    // Post-flight governance
    const postflight = await runPostflight(
      llmResult.text,
      sessionId,
      deps.repo,
      deps.resonance,
      deps.auditBridge,
      deps.db,
    );

    const verdict = deriveVerdict(preflight, postflight);

    const envelope: GovernanceEnvelope = {
      ok:         true,
      request_id: requestId,
      session_id: sessionId,
      response:   llmResult.text,
      model:      llmResult.model,
      governance: {
        verdict,
        version:    "1.0",
        pre_flight:  preflight,
        post_flight: postflight,
      },
      usage: llmResult.usage,
    };

    res.setHeader("X-AEGIS-Verdict",  verdict);
    res.setHeader("X-Request-Id",     requestId);
    res.json(envelope);
  };
}

// ---------------------------------------------------------------------------
// POST /api/llm/stream — SSE streaming with interleaved governance events
//
// Event sequence:
//   preflight → token×N → done  (client gets complete response immediately)
//   ↓ async
//   postflight → (governance panel updates)
// ---------------------------------------------------------------------------

function handleStream(deps: LlmRouterDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    // Phase 1: validate BEFORE any headers flush
    const validation = validateLLMRequest(req.body);
    if (!validation.ok) {
      res.status(400).json({ ok: false, error: validation.error, field: validation.field });
      return;
    }

    const { prompt, session_id, model } = validation.body;
    const requestId = RequestId(randomUUID());
    const sessionId = SessionId(session_id);
    const modelId   = ModelId(model);

    // Phase 2: commit to SSE — no more HTTP status codes after this point
    initSSEResponse(res);
    res.setHeader("X-AEGIS-Verdict", "pending");
    res.setHeader("X-Request-Id",    requestId);

    const { controller, cleanup } = buildAbortController(req);
    const stopKeepAlive           = startKeepAlive(res);

    try {
      // Pre-flight governance (before streaming starts)
      const preflight = await runPreflight(prompt, sessionId, deps.repo);
      writeSSEEvent(res, "preflight", preflight);

      // Stream LLM tokens
      let accumulated = "";
      const generator = deps.provider.stream({
        model:    modelId,
        messages: [{ role: "user", content: prompt }],
        signal:   controller.signal,
      });

      let usage = { input_tokens: 0, output_tokens: 0, provider: deps.provider.providerId };

      for await (const chunk of generator) {
        if (chunk.type === "text_delta") {
          accumulated += chunk.text;
          writeSSEEvent(res, "token", { chunk: chunk.text });
        } else if (chunk.type === "usage") {
          usage = chunk.usage;
        } else if (chunk.type === "error") {
          sendSSEError(res, chunk.error.code, true);
          return;
        }
      }

      // Send done BEFORE post-flight — client gets the complete response now.
      writeSSEEvent(res, "done", { response: accumulated, usage });

      // Post-flight governance (async, non-blocking for the client)
      const postflight = await runPostflight(
        accumulated,
        sessionId,
        deps.repo,
        deps.resonance,
        deps.auditBridge,
        deps.db,
      );

      const verdict = deriveVerdict(preflight, postflight);

      writeSSEEvent(res, "postflight", { ...postflight, verdict });
      res.setHeader("X-AEGIS-Verdict", verdict);

    } catch (err) {
      const isDisconnect =
        err instanceof Error &&
        (err.message === "CLIENT_DISCONNECTED" || err.message === "TIMEOUT" || err.name === "AbortError");
      if (!isDisconnect) {
        sendSSEError(res, "LLM_PROVIDER_FRACTURED", true);
      }
    } finally {
      stopKeepAlive();
      cleanup();
      if (!res.writableEnded) res.end();
    }
  };
}

// ---------------------------------------------------------------------------
// GET /api/llm/models — list available models for current provider
// ---------------------------------------------------------------------------

function handleModels(deps: LlmRouterDeps) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const models = await deps.provider.listModels();
      res.json({ ok: true, provider: deps.provider.providerId, models });
    } catch {
      res.status(502).json({ ok: false, error: "Failed to list models" });
    }
  };
}

// ---------------------------------------------------------------------------
// GET /api/llm/config — current provider info (no secrets)
// ---------------------------------------------------------------------------

function handleConfig(deps: LlmRouterDeps) {
  return (_req: Request, res: Response): void => {
    res.json({
      ok:          true,
      provider_id: deps.provider.providerId,
      display_name: deps.provider.displayName,
      default_model: process.env["AEGIS_LLM_DEFAULT_MODEL"] ?? null,
    });
  };
}

// ---------------------------------------------------------------------------
// Router factory — deps injected once at startup
// ---------------------------------------------------------------------------

export function createLlmRouter(deps: LlmRouterDeps): Router {
  const router = Router();

  router.post("/chat",    handleChat(deps));
  router.post("/stream",  handleStream(deps));
  router.get("/models",   handleModels(deps));
  router.get("/config",   handleConfig(deps));

  return router;
}
