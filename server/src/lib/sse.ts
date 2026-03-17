// FILE: server/src/lib/sse.ts
// Shared SSE utilities used by all streaming endpoints.

import type { Request, Response } from "express";

/**
 * Wires an AbortController to both a client-disconnect event and an optional
 * timeout. Returns a cleanup function that must be called in a finally block.
 */
export function buildAbortController(
  req: Request,
  timeoutMs = 90_000,
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();

  const onClose = () => controller.abort(new Error("CLIENT_DISCONNECTED"));
  req.on("close", onClose);

  const timer = setTimeout(
    () => controller.abort(new Error("TIMEOUT")),
    timeoutMs,
  );

  const cleanup = () => {
    clearTimeout(timer);
    req.off("close", onClose);
  };

  return { controller, cleanup };
}

/**
 * Writes SSE comment-line keep-alives every intervalMs.
 * Prevents proxy / load-balancer timeouts during slow LLM responses.
 * Returns a stop function that must be called in a finally block.
 */
export function startKeepAlive(
  res: Response,
  intervalMs = 15_000,
): () => void {
  const timer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keep-alive\n\n");
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

/**
 * Sends an error to the client.
 *
 * - If headers have NOT been sent (i.e. we can still set HTTP status):
 *   sends a JSON error response with the appropriate status code.
 *
 * - If headers HAVE been sent (mid-stream):
 *   sends a typed SSE "error" event and ends the response.
 *
 * This is the bifurcation point described in the plan.
 */
export function sendSSEError(
  res: Response,
  code: string,
  retryable = false,
  statusCode = 502,
): void {
  if (!res.headersSent) {
    res.status(statusCode).json({ ok: false, error: code, retryable });
    return;
  }
  if (!res.writableEnded) {
    res.write(`event: error\ndata: ${JSON.stringify({ code, retryable })}\n\n`);
    res.end();
  }
}

/**
 * Sets standard SSE response headers and flushes them to the client.
 * After this call, HTTP status codes can no longer be sent — use sendSSEError.
 */
export function initSSEResponse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as unknown as { flushHeaders: () => void }).flushHeaders();
  }
}

/**
 * Writes a named SSE event with JSON-serialised data.
 * All LLM output MUST pass through JSON.stringify before reaching this
 * function to prevent SSE response-splitting via injected newlines.
 */
export function writeSSEEvent(res: Response, event: string, data: unknown): void {
  if (!res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
