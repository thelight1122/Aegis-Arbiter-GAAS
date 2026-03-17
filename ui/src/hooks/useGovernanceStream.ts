// FILE: ui/src/hooks/useGovernanceStream.ts
// SSE streaming hook using fetch + ReadableStream (not EventSource — we POST a body).

import { useCallback, useRef } from "react";

export interface PreflightEvent {
  pressure_score: number;
  is_resonant:    boolean;
  findings:       Array<{ type: string; severity: number; evidence: string }>;
  tensor_id:      string;
}

export interface PostflightEvent {
  findings:    Array<{ type: string; severity: number; evidence: string }>;
  lens_status: { physical: number; emotional: number; mental: number; spiritual: number; fractures: string[] };
  flow:        number;
  delta:       number;
  ids:         { identify: string; define: string; reflect: string; suggest: string[]; sequence: string } | null;
  tensor_id:   string;
  verdict:     "pass" | "warn" | "block";
}

export interface StreamHandlers {
  onPreflight:  (data: PreflightEvent)  => void;
  onToken:      (chunk: string)          => void;
  onPostflight: (data: PostflightEvent) => void;
  onDone:       (response: string)      => void;
  onError:      (msg: string)           => void;
}

export function useGovernanceStream() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (
    endpoint: string,
    body: unknown,
    handlers: StreamHandlers,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept":       "text/event-stream",
        },
        body:   JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handlers.onError("Network error — could not connect to server");
      }
      return;
    }

    if (!res.ok || !res.body) {
      handlers.onError(`Server error ${res.status}`);
      return;
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventMatch = frame.match(/^event: (\w+)/m);
          const dataMatch  = frame.match(/^data: (.+)/m);
          if (!dataMatch) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(dataMatch[1]) as Record<string, unknown>;
          } catch {
            continue;
          }

          const eventName = eventMatch?.[1];
          if (eventName === "preflight") {
            handlers.onPreflight(parsed as unknown as PreflightEvent);
          } else if (eventName === "token") {
            handlers.onToken((parsed["chunk"] as string) ?? "");
          } else if (eventName === "postflight") {
            handlers.onPostflight(parsed as unknown as PostflightEvent);
          } else if (eventName === "done") {
            handlers.onDone((parsed["response"] as string) ?? "");
          } else if (eventName === "error") {
            handlers.onError((parsed["code"] as string) ?? "Stream error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handlers.onError("Stream read error");
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, cancel };
}
