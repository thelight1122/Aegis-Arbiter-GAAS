// FILE: ui/src/components/LLMGovernanceView.tsx
// Governed LLM chat interface — shows pre-flight and post-flight AEGIS signals.

import React, { memo, useCallback, useRef, useState } from "react";
import { useGovernanceStream } from "../hooks/useGovernanceStream.js";
import type { PreflightEvent, PostflightEvent } from "../hooks/useGovernanceStream.js";
import "./LLMGovernanceView.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role:    "user" | "assistant";
  content: string;
}

type StreamPhase = "idle" | "preflight" | "tokens" | "postflight" | "done";

// ---------------------------------------------------------------------------
// GovernancePanel — memoised so token flushes don't cause re-renders
// ---------------------------------------------------------------------------

interface GovernancePanelProps {
  phase:      StreamPhase;
  preflight:  PreflightEvent  | null;
  postflight: PostflightEvent | null;
}

const GovernancePanel = memo(function GovernancePanel({
  phase,
  preflight,
  postflight,
}: GovernancePanelProps) {
  if (!preflight && phase === "idle") {
    return (
      <div className="gov-panel gov-panel--empty">
        <div className="gov-empty-text">
          Governance signals will appear here after you send a message.
        </div>
      </div>
    );
  }

  const verdict = postflight?.verdict ?? (phase === "done" ? "pass" : null);

  return (
    <div className="gov-panel" data-phase={phase}>
      {/* Verdict badge */}
      {verdict && (
        <div className={`gov-verdict gov-verdict--${verdict}`}>
          {verdict === "pass" ? "✓ PASS" : verdict === "warn" ? "⚠ WARN" : "✗ BLOCK"}
        </div>
      )}

      {/* Pre-flight section */}
      {preflight && (
        <section className="gov-section">
          <div className="gov-section-label">Pre-flight</div>
          <div className="gov-metric-row">
            <span className="gov-metric-name">Pressure</span>
            <span className="gov-metric-value">
              {(preflight.pressure_score * 100).toFixed(0)}%
              {" "}
              <span className={preflight.is_resonant ? "gov-good" : "gov-bad"}>
                {preflight.is_resonant ? "resonant" : "non-resonant"}
              </span>
            </span>
          </div>
          {preflight.findings.length > 0 && (
            <div className="gov-findings">
              {preflight.findings.map((f, i) => (
                <div key={i} className="gov-finding">
                  <span className="gov-finding-type">{f.type}</span>
                  {f.evidence && (
                    <span className="gov-finding-evidence">"{f.evidence.slice(0, 60)}"</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Post-flight section */}
      <div className={`gov-postflight-section${phase !== "done" && phase !== "postflight" ? " gov-postflight-section--pending" : ""}`}>
        {postflight ? (
          <section className="gov-section">
            <div className="gov-section-label">Post-flight</div>

            {/* AEGIS Flow bar */}
            <div className="gov-metric-row">
              <span className="gov-metric-name">AEGIS Flow</span>
              <span className="gov-metric-value">{(postflight.flow * 100).toFixed(0)}%</span>
            </div>
            <div className="gov-flow-bar" aria-hidden="true">
              <div
                className="gov-flow-bar-fill"
                style={{ width: `${Math.round(postflight.flow * 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(postflight.flow * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {/* 4-body lenses */}
            <div className="gov-lenses">
              {(["physical", "emotional", "mental", "spiritual"] as const).map((lens) => (
                <div key={lens} className="gov-lens">
                  <span className="gov-lens-name">{lens.slice(0, 4)}</span>
                  <div className="gov-lens-bar">
                    <div
                      className="gov-lens-bar-fill"
                      style={{ width: `${Math.round(postflight.lens_status[lens] * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Fractures */}
            {postflight.lens_status.fractures.length > 0 && (
              <div className="gov-fractures">
                {postflight.lens_status.fractures.map((f, i) => (
                  <div key={i} className="gov-fracture">{f}</div>
                ))}
              </div>
            )}

            {/* IDS suggestion */}
            {postflight.ids && (
              <div className="gov-ids">
                <div className="gov-section-label">IDS — {postflight.ids.sequence}</div>
                <div className="gov-ids-identify">{postflight.ids.identify}</div>
                {postflight.ids.suggest.slice(0, 2).map((s, i) => (
                  <div key={i} className="gov-ids-suggest">→ {s}</div>
                ))}
              </div>
            )}
          </section>
        ) : (
          phase !== "idle" && (
            <div className="gov-section gov-section--muted">
              <div className="gov-section-label">Post-flight</div>
              <div className="gov-pending">
                {phase === "tokens" ? "awaiting response…" : "running…"}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// LLMGovernanceView
// ---------------------------------------------------------------------------

export default function LLMGovernanceView() {
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [activeGov,     setActiveGov]     = useState<{ pre: PreflightEvent | null; post: PostflightEvent | null }>({ pre: null, post: null });
  const [streamPhase,   setStreamPhase]   = useState<StreamPhase>("idle");
  const [prompt,        setPrompt]        = useState("");
  const [sessionId,     setSessionId]     = useState(() =>
    `arbiter-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  // Token accumulation — lives in a ref; React state only catches up on paint.
  const streamBufferRef = useRef("");
  const flushTimerRef   = useRef<number | null>(null);

  const { stream, cancel } = useGovernanceStream();

  const apiUrl = (import.meta as { env: Record<string, string> }).env["VITE_API_URL"] || "http://localhost:8787";

  const flushBuffer = useCallback(() => {
    flushTimerRef.current = null;
    setMessages((prev) => {
      const updated = [...prev];
      const last    = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, content: streamBufferRef.current };
      }
      return updated;
    });
  }, []);

  const onToken = useCallback((chunk: string) => {
    streamBufferRef.current += chunk;
    if (flushTimerRef.current === null) {
      flushTimerRef.current = requestAnimationFrame(flushBuffer);
    }
  }, [flushBuffer]);

  async function onSend() {
    const trimmed = prompt.trim();
    if (!trimmed || streamPhase !== "idle") return;

    setErrorMsg(null);
    setPrompt("");
    setStreamPhase("preflight");
    setActiveGov({ pre: null, post: null });
    streamBufferRef.current = "";

    // Add user message + empty assistant placeholder.
    setMessages((prev) => [
      ...prev,
      { role: "user",      content: trimmed },
      { role: "assistant", content: "" },
    ]);

    await stream(
      `${apiUrl}/api/llm/stream`,
      { prompt: trimmed, session_id: sessionId, model: "" },
      {
        onPreflight: (data) => {
          setActiveGov((prev) => ({ ...prev, pre: data }));
          setStreamPhase("tokens");
        },
        onToken,
        onPostflight: (data) => {
          setActiveGov((prev) => ({ ...prev, post: data }));
          setStreamPhase("postflight");
        },
        onDone: (_response) => {
          // Flush any remaining buffer on done.
          if (flushTimerRef.current !== null) {
            cancelAnimationFrame(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          flushBuffer();
          setStreamPhase("done");
        },
        onError: (msg) => {
          setErrorMsg(msg);
          setStreamPhase("idle");
          // Remove empty assistant placeholder.
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === "assistant" && updated[updated.length - 1].content === "") {
              updated.pop();
            }
            return updated;
          });
        },
      },
    );

    // Allow new messages once stream completes.
    setStreamPhase("idle");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  }

  function onClear() {
    cancel();
    setMessages([]);
    setActiveGov({ pre: null, post: null });
    setStreamPhase("idle");
    setErrorMsg(null);
    streamBufferRef.current = "";
    setSessionId(`arbiter-${Math.random().toString(36).slice(2, 10)}`);
  }

  const isStreaming = streamPhase !== "idle";

  return (
    <div className="lgv">
      <div className="lgv-chat-col">
        {/* Message thread */}
        <div className="lgv-messages">
          {messages.length === 0 && (
            <div className="lgv-empty">
              Send a message to route it through the AEGIS governance pipeline.
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`lgv-msg lgv-msg--${msg.role}`}>
              <div className="lgv-msg-role">
                {msg.role === "user" ? "You" : "LLM"}
              </div>
              <div className="lgv-msg-content">
                {msg.content || (msg.role === "assistant" && isStreaming ? (
                  <span className="lgv-cursor">▊</span>
                ) : null)}
              </div>
            </div>
          ))}
          {errorMsg && (
            <div className="lgv-error">{errorMsg}</div>
          )}
        </div>

        {/* Input row */}
        <div className="lgv-input-row">
          <div className="lgv-session-id" title={`Session: ${sessionId}`}>
            ⬡ {sessionId.slice(-8)}
          </div>
          <textarea
            className="lgv-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            disabled={isStreaming}
            rows={3}
          />
          <div className="lgv-btn-row">
            <button
              className="lgv-btn lgv-btn--send"
              onClick={() => void onSend()}
              disabled={isStreaming || !prompt.trim()}
            >
              {isStreaming ? "Streaming…" : "Send"}
            </button>
            <button
              className="lgv-btn lgv-btn--clear"
              onClick={onClear}
            >
              {isStreaming ? "Cancel" : "Clear"}
            </button>
          </div>
        </div>
      </div>

      {/* Governance telemetry panel */}
      <div className="lgv-gov-col">
        <div className="lgv-gov-header">AEGIS Governance</div>
        <GovernancePanel
          phase={streamPhase}
          preflight={activeGov.pre}
          postflight={activeGov.post}
        />
      </div>
    </div>
  );
}
