// /aegis-peer/src/MirrorApp.tsx
import React, { useRef, useState } from "react";
import "./MirrorApp.css";
import { GlassGate } from "./components/GlassGate";
import { TrajectoryMap } from "./components/TrajectoryMap";
import { SpineExplorer } from "./components/SpineExplorer";
import { apiUrl } from "./lib/apiBase";
import ReportOutput, {
  type AegisEngineResult,
  type ReportType,
} from "./components/ReportOutput";
import {
  describeLevel,
  levelTone,
  normalizeLenses,
  formatAlignment,
  isReportCapableIds,
  formatRecordingTime,
  type LensValues,
} from "./lib/mirrorUtils";
import { useWaveform } from "./hooks/useWaveform";
import { useMediaRecorder } from "./hooks/useMediaRecorder";

const styles = {
  container: "mirror-app-container",
  journal: "mirror-app-journal",
  button: "mirror-app-button",
};

/**
 * MirrorApp provides the full-featured peer interface for self-reflection.
 * Fulfills AXIOM_5_AWARENESS.
 */
export const MirrorApp: React.FC = () => {
  const [reflection, setReflection] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [idsBlock, setIdsBlock] = useState<Record<string, unknown> | null>(null);
  const [alignment, setAlignment] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [lenses, setLenses] = useState<LensValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`mirror_${Date.now()}`);
  const [reportHistory, setReportHistory] = useState<AegisEngineResult[]>([]);
  const [reportType, setReportType] = useState<ReportType>("single");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveform = useWaveform(canvasRef);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const applyMirrorResponse = (data: Record<string, unknown>, fallbackTranscript?: string) => {
    setLastResponse(data);
    setIdsBlock((data.ids as Record<string, unknown>) ?? null);
    setAlignment((data.alignment as string) ?? null);
    const nextLenses =
      normalizeLenses(data.lenses) ?? normalizeLenses((data.telemetry as any)?.lenses);
    setLenses(nextLenses);
    const nextTranscript = ((data.transcript as string) ?? fallbackTranscript ?? "").trim() || null;
    setTranscript(nextTranscript);
    setAnalysisStatus("Analysis complete.");

    if (isReportCapableIds(data.ids)) {
      setReportHistory((prev) => [
        ...prev,
        { ...(data.ids as AegisEngineResult), vector: nextTranscript ?? fallbackTranscript ?? "" },
      ]);
    }
  };

  const applyMirrorError = (msg: string) => {
    setError(msg);
    setIdsBlock(null);
    setAlignment(null);
    setLenses(null);
    setTranscript(null);
    setAnalysisStatus("Analysis failed.");
  };

  // ── Media recorder ─────────────────────────────────────────────────────────

  const recorder = useMediaRecorder({
    sessionId,
    onStreamReady: waveform.start,
    onRecordingStopped: waveform.stop,
    onSuccess: (data) => applyMirrorResponse(data as Record<string, unknown>),
    onError: (msg, rawData) => {
      applyMirrorError(msg);
      setLastResponse(rawData ?? null);
    },
    onLoadingChange: setIsLoading,
    onStatusChange: setAnalysisStatus,
  });

  // ── Text submission ─────────────────────────────────────────────────────────

  const handleInhale = async () => {
    const trimmed = reflection.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setTranscript(trimmed);
    setAnalysisStatus("Analyzing input...");

    try {
      const res = await fetch(apiUrl("/mirror/reflect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        applyMirrorError(data?.error ?? "Mirror reflection failed.");
        setLastResponse(data);
        return;
      }

      applyMirrorResponse(data, trimmed);
    } catch {
      applyMirrorError("Unable to reach the mirror service.");
      setLastResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── UI actions ──────────────────────────────────────────────────────────────

  const handleClear = () => {
    setReflection("");
    setIdsBlock(null);
    setAlignment(null);
    setLenses(null);
    setTranscript(null);
    setError(null);
    setAnalysisStatus(null);
    setReportHistory([]);
    setReportType("single");
    setLastResponse(null);
  };

  const handleDownloadReport = () => {
    const emotionalValue = lenses?.emotional;
    const lines = [
      "# Mirror Reflect Connect Report",
      `Session: ${sessionId}`,
      `Generated: ${new Date().toISOString()}`,
      `Status: ${analysisStatus ?? "unknown"}`,
      "",
      "## Transcript",
      transcript ?? "(none)",
      "",
      "## Alignment",
      alignment ?? "(none)",
      "",
      "## Emotional State",
      typeof emotionalValue === "number"
        ? `${Math.round(emotionalValue * 100)}% (${describeLevel(emotionalValue)})`
        : "(none)",
      "",
      "## IDS",
      idsBlock
        ? `Identify: ${idsBlock.identify}\nDefine: ${idsBlock.define}\nSuggest:\n- ${
            (idsBlock.suggest as string[] ?? []).join("\n- ")
          }`
        : "(none)",
      "",
      "## Raw Response",
      lastResponse
        ? "```json\n" + JSON.stringify(lastResponse, null, 2) + "\n```"
        : "(none)",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mirror-report-${sessionId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived display values ──────────────────────────────────────────────────

  const emotionalValue = lenses?.emotional;
  const emotionalTone = levelTone(emotionalValue);
  const canInhale = reflection.trim().length > 0 && !isLoading;
  const hasIds =
    Boolean(idsBlock?.identify) ||
    Boolean(idsBlock?.define) ||
    (Array.isArray(idsBlock?.suggest) && (idsBlock.suggest as unknown[]).length > 0);
  const hasReport = reportHistory.length > 0;
  const hasOutput = Boolean(idsBlock || alignment || lenses || analysisStatus || hasReport);
  const reportCapabilityNote =
    lastResponse && !hasReport
      ? "Report mode is waiting on Linq-style ids fields (peerWeights/logic/emotion/etc). Showing IDS + raw payload."
      : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <header className="mirror-topbar">
        <div className="mirror-brand">
          <p className="mirror-eyebrow">Mirror Reflect Connect</p>
          <h1 className="mirror-title">Reflection Interface</h1>
        </div>
        <div className="mirror-status">
          <span className="mirror-pill">Session {sessionId}</span>
          <span className="mirror-pill mirror-pill-quiet">Coherence live</span>
        </div>
      </header>

      <div className="mirror-layout">
        {/* ── Left column ── */}
        <section className="mirror-column mirror-left">
          <div className="mirror-card mirror-transcript">
            <div className="mirror-card-header">
              <h2 className="mirror-card-title">Audio transcript</h2>
              <span className="mirror-badge">
                {recorder.mode ? `Recording ${recorder.mode}` : "Listening"}
              </span>
            </div>
            <canvas className="mirror-waveform" ref={canvasRef} width={520} height={80} />
            <p className="mirror-muted">
              {(transcript ?? reflection) || "Transcript will appear here when audio capture is enabled."}
            </p>
            {recorder.mode && (
              <p className="mirror-recording">
                {formatRecordingTime(recorder.seconds)} / 3:00 max
              </p>
            )}
          </div>

          <div className="mirror-card mirror-display">
            <div className="mirror-card-header">
              <h2 className="mirror-card-title">Reflection mirror</h2>
              <span className="mirror-badge">Output</span>
            </div>

            <div className="mirror-output">
              {analysisStatus && <p className="mirror-status-line">{analysisStatus}</p>}
              {reportCapabilityNote && <p className="mirror-muted">{reportCapabilityNote}</p>}

              {hasReport && (
                <div className="mirror-report-selector">
                  <span className="mirror-insight-label">Report mode</span>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="mirror-report-dropdown"
                    title="Select report mode"
                  >
                    <option value="single">Single</option>
                    <option value="cumulative">Cumulative (last 5)</option>
                    <option value="aggregate">Aggregate (all)</option>
                  </select>
                </div>
              )}

              {!hasOutput && (
                <p className="mirror-muted">Reflection output will render here after initiation.</p>
              )}

              {alignment && (
                <p className="mirror-insight-alignment">
                  {formatAlignment(alignment, emotionalValue) ?? alignment}
                </p>
              )}

              {(typeof emotionalValue === "number" || hasIds) && (
                <div className="mirror-emotion-card">
                  <p className="mirror-insight-label">Peer emotional state</p>
                  <p className="mirror-emotion-summary">
                    {hasIds
                      ? String(idsBlock?.identify)
                      : "Telemetry snapshot only. IDS language not available yet."}
                  </p>
                  {typeof emotionalValue === "number" && (
                    <div className="mirror-emotion-row">
                      <span className="mirror-emotion-value">
                        {Math.round(emotionalValue * 100)}%
                      </span>
                      <span className={`mirror-emotion-level mirror-emotion-${emotionalTone}`}>
                        {describeLevel(emotionalValue)}
                      </span>
                    </div>
                  )}
                  {typeof emotionalValue === "number" && (
                    <p className="mirror-emotion-note">Emotional lens meter (telemetry).</p>
                  )}
                </div>
              )}

              {hasReport ? (
                <div className="mirror-ids-block mirror-report-output">
                  <ReportOutput history={reportHistory} reportType={reportType} />
                </div>
              ) : hasIds ? (
                <div className="mirror-ids-block">
                  <div className="mirror-insight-grid">
                    <div>
                      <p className="mirror-insight-label">Identify</p>
                      <p className="mirror-insight-value">{String(idsBlock?.identify)}</p>
                    </div>
                    <div>
                      <p className="mirror-insight-label">Define</p>
                      <p className="mirror-insight-value">{String(idsBlock?.define)}</p>
                    </div>
                  </div>
                  <ul className="mirror-insight-list">
                    {(idsBlock?.suggest as string[] ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {lastResponse !== null && (
                <div className="mirror-ids-block" style={{ marginTop: 16 }}>
                  <p className="mirror-insight-label">Raw response (debug)</p>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: 12,
                      opacity: 0.9,
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="mirror-lower-row">
            <div className="mirror-card">
              <h3 className="mirror-card-title">ST recordings</h3>
              <TrajectoryMap sessionId={sessionId} />
            </div>
            <div className="mirror-card">
              <h3 className="mirror-card-title">Past records</h3>
              <SpineExplorer sessionId={sessionId} />
            </div>
          </div>
        </section>

        {/* ── Right column ── */}
        <aside className="mirror-column mirror-right">
          <div className="mirror-card mirror-chat">
            <div className="mirror-card-header">
              <h2 className="mirror-card-title">Reflection chamber chat</h2>
              <span className="mirror-badge">Input</span>
            </div>

            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Begin your reflection..."
              className={styles.journal}
            />

            <div className="mirror-chat-actions">
              <button
                type="button"
                onClick={handleInhale}
                className={styles.button}
                disabled={!canInhale}
              >
                {isLoading ? "Inhaling..." : "Initiate"}
              </button>

              <button type="button" className="mirror-ghost" onClick={handleClear}>
                Clear
              </button>

              <button
                type="button"
                className="mirror-ghost"
                onClick={() => recorder.toggle("audio")}
                disabled={isLoading || (recorder.mode !== null && recorder.mode !== "audio")}
              >
                {recorder.mode === "audio" ? "Stop audio" : "Audio record"}
              </button>

              <button
                type="button"
                className="mirror-ghost"
                onClick={() => recorder.toggle("video")}
                disabled={isLoading || (recorder.mode !== null && recorder.mode !== "video")}
              >
                {recorder.mode === "video" ? "Stop video" : "Video record"}
              </button>

              <button
                type="button"
                className="mirror-ghost"
                disabled={!hasOutput}
                onClick={handleDownloadReport}
              >
                Download report
              </button>
            </div>

            {error && <div className="mirror-app-error">{error}</div>}
          </div>

          <div className="mirror-card mirror-telemetry">
            <h3 className="mirror-card-title">Peer status audio</h3>
            <GlassGate />
          </div>
        </aside>
      </div>
    </div>
  );
};
