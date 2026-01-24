// FILE: ui/src/MirrorApp.tsx

import React, { useRef, useState } from "react";
import "./MirrorApp.css";
import { GlassGate } from "./components/GlassGate";
import { TrajectoryMap } from "./components/TrajectoryMap";
import { SpineExplorer } from "./components/SpineExplorer";
import { apiUrl } from "./lib/apiBase";

// ✅ Linq-style report renderer
import ReportOutput, {
  type AegisEngineResult,
  type ReportType,
} from "./components/ReportOutput";

const styles = {
  container: "mirror-app-container",
  journal: "mirror-app-journal",
  button: "mirror-app-button",
};

/**
 * MirrorApp provides the full-featured interface for self-reflection.
 * It fulfills AXIOM_5_AWARENESS.
 */
export const MirrorApp: React.FC = () => {
  const [reflection, setReflection] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [idsBlock, setIdsBlock] = useState<any>(null);
  const [alignment, setAlignment] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [lenses, setLenses] = useState<{
    physical?: number;
    emotional?: number;
    mental?: number;
    spiritual?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`mirror_${Date.now()}`);
  const [recordingMode, setRecordingMode] = useState<"audio" | "video" | null>(
    null
  );
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // ✅ New: Linq-style report state
  const [reportHistory, setReportHistory] = useState<AegisEngineResult[]>([]);
  const [reportType, setReportType] = useState<ReportType>("single");

  // ✅ New: Debug — store last raw response
  const [lastResponse, setLastResponse] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const MAX_RECORDING_MS = 3 * 60 * 1000;

  const describeLevel = (value?: number) => {
    if (typeof value !== "number") return "Unknown";
    if (value >= 0.75) return "High";
    if (value >= 0.45) return "Steady";
    if (value >= 0.25) return "Low";
    return "Depleted";
  };

  const levelTone = (value?: number) => {
    if (typeof value !== "number") return "unknown";
    if (value >= 0.75) return "strong";
    if (value >= 0.45) return "steady";
    if (value >= 0.25) return "low";
    return "critical";
  };

  const normalizeLenses = (payload: any) => {
    if (!payload || typeof payload !== "object") return null;
    const { physical, emotional, mental, spiritual } = payload as {
      physical?: number;
      emotional?: number;
      mental?: number;
      spiritual?: number;
    };
    const hasValue = [physical, emotional, mental, spiritual].some(
      (value) => typeof value === "number"
    );
    return hasValue ? { physical, emotional, mental, spiritual } : null;
  };

  const formatAlignment = (raw: string | null, emotional?: number) => {
    if (!raw) return null;
    const match = raw.match(/Delta=([0-9.]+)/i);
    const delta = match ? Number.parseFloat(match[1]) : null;
    const emotionScore = typeof emotional === "number" ? emotional : null;

    if (delta !== null && !Number.isNaN(delta)) {
      if (delta >= 0.8) {
        return "Peer emotional state shows acute tension and destabilization. Focus on grounding and safety.";
      }
      if (delta >= 0.55) {
        return "Peer emotional state shows elevated strain. Provide calm, specific support.";
      }
      if (delta >= 0.3) {
        return "Peer emotional state shows mild friction. Invite reflection and gentle pacing.";
      }
      return "Peer emotional state appears steady. Encourage continued clarity and choice.";
    }

    if (emotionScore !== null) {
      if (emotionScore >= 0.75) {
        return "Peer emotional state is energized and expressive. Channel toward constructive action.";
      }
      if (emotionScore >= 0.45) {
        return "Peer emotional state is stable with manageable tension. Maintain steady support.";
      }
      if (emotionScore >= 0.25) {
        return "Peer emotional state is low and guarded. Offer reassurance and space.";
      }
      return "Peer emotional state is depleted. Prioritize rest and emotional safety.";
    }

    return raw;
  };

  // ✅ Detect whether ids payload supports Linq-style report rendering
  const isReportCapableIds = (ids: any): ids is AegisEngineResult => {
    if (!ids || typeof ids !== "object") return false;
    const peerWeightsOk =
      Array.isArray(ids.peerWeights) &&
      ids.peerWeights.length === 7 &&
      ids.peerWeights.every((n: any) => typeof n === "number");
    return (
      peerWeightsOk &&
      typeof ids.logic === "number" &&
      typeof ids.emotion === "number" &&
      typeof ids.moodType === "string" &&
      typeof ids.keyAxiom === "number" &&
      typeof ids.peerSummary === "string" &&
      typeof ids.suggestText === "string" &&
      typeof ids.isFractured === "boolean"
    );
  };

  const applyMirrorResponse = (data: any, fallbackTranscript?: string) => {
    setLastResponse(data);

    const nextTranscript =
      (data?.transcript ?? fallbackTranscript ?? "").trim() || null;

    setIdsBlock(data?.ids ?? null);
    setAlignment(data?.alignment ?? null);

    const nextLenses =
      normalizeLenses(data?.lenses) ?? normalizeLenses(data?.telemetry?.lenses);
    setLenses(nextLenses);

    setTranscript(nextTranscript);
    setAnalysisStatus("Analysis complete.");

    // ✅ If the API returns the richer Linq-style shape, capture it into report history
    if (isReportCapableIds(data?.ids)) {
      const enriched: AegisEngineResult = {
        ...data.ids,
        vector: nextTranscript ?? fallbackTranscript ?? "",
      };
      setReportHistory((prev) => [...prev, enriched]);
    }
  };

  const startWaveform = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    const AudioContextConstructor =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgba(244, 200, 200, 0.9)";
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i += 1) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      animationRef.current = window.requestAnimationFrame(draw);
    };

    draw();
  };

  const stopWaveform = () => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

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
        setError(data?.error ?? "Mirror reflection failed.");
        setIdsBlock(null);
        setAlignment(null);
        setLenses(null);
        setTranscript(null);
        setAnalysisStatus("Analysis failed.");
        setLastResponse(data);
        return;
      }

      applyMirrorResponse(data, trimmed);
    } catch {
      setError("Unable to reach the mirror service.");
      setIdsBlock(null);
      setAlignment(null);
      setLenses(null);
      setTranscript(null);
      setAnalysisStatus("Analysis failed.");
      setLastResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const canInhale = reflection.trim().length > 0 && !isLoading;
  const emotionalValue = lenses?.emotional;
  const emotionalTone = levelTone(emotionalValue);

  const hasIds =
    Boolean(idsBlock?.identify) ||
    Boolean(idsBlock?.define) ||
    (Array.isArray(idsBlock?.suggest) && idsBlock.suggest.length > 0);

  const hasReport = reportHistory.length > 0;
  const hasOutput = Boolean(idsBlock || alignment || lenses || analysisStatus || hasReport);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async (mode: "audio" | "video") => {
    if (recordingMode || isLoading) return;
    setError(null);
    setAnalysisStatus(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });

      const preferredType = mode === "video" ? "video/webm" : "audio/webm";
      const options = MediaRecorder.isTypeSupported(preferredType)
        ? { mimeType: preferredType }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        stopWaveform();
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        if (timerRef.current) window.clearInterval(timerRef.current);

        const recordedChunks = chunksRef.current;
        chunksRef.current = [];
        setRecordingMode(null);
        setRecordingSeconds(0);

        if (recordedChunks.length === 0) {
          setError("No recording data captured.");
          return;
        }

        const blob = new Blob(recordedChunks, { type: recorder.mimeType });
        setIsLoading(true);
        setError(null);
        setAnalysisStatus("Transcribing and analyzing...");

        try {
          const res = await fetch(
            apiUrl(`/mirror/reflect-media?sessionId=${sessionId}`),
            {
              method: "POST",
              headers: {
                "Content-Type": blob.type || "application/octet-stream",
              },
              body: blob,
            }
          );
          const data = await res.json();

          if (!res.ok || data?.ok === false) {
            setError(data?.error ?? "Mirror reflection failed.");
            setIdsBlock(null);
            setAlignment(null);
            setLenses(null);
            setTranscript(null);
            setAnalysisStatus("Analysis failed.");
            setLastResponse(data);
            return;
          }

          applyMirrorResponse(data);
        } catch {
          setError("Unable to reach the mirror service.");
          setIdsBlock(null);
          setAlignment(null);
          setLenses(null);
          setTranscript(null);
          setAnalysisStatus("Analysis failed.");
          setLastResponse(null);
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingMode(mode);
      setRecordingSeconds(0);
      startWaveform(stream);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      timeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_MS);
    } catch {
      setError("Microphone or camera access was denied.");
    }
  };

  const toggleRecording = (mode: "audio" | "video") => {
    if (recordingMode === mode) stopRecording();
    else startRecording(mode);
  };

  const formatRecordingTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDownloadReport = () => {
    const lines = [
      "# Mirror Reflect Connect Report",
      `Session: ${sessionId}`,
      `Generated: ${new Date().toISOString()}`,
      analysisStatus ? `Status: ${analysisStatus}` : "Status: unknown",
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
        ? `Identify: ${idsBlock.identify}\nDefine: ${idsBlock.define}\nSuggest:\n- ${(idsBlock.suggest ?? []).join(
            "\n- "
          )}`
        : "(none)",
      "",
      "## Raw Response",
      lastResponse ? "```json\n" + JSON.stringify(lastResponse, null, 2) + "\n```" : "(none)",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mirror-report-${sessionId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const reportCapabilityNote =
    lastResponse && !hasReport
      ? "Report mode is waiting on Linq-style ids fields (peerWeights/logic/emotion/etc). Showing IDS + raw payload."
      : null;

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
        <section className="mirror-column mirror-left">
          <div className="mirror-card mirror-transcript">
            <div className="mirror-card-header">
              <h2 className="mirror-card-title">Audio transcript</h2>
              <span className="mirror-badge">
                {recordingMode ? `Recording ${recordingMode}` : "Listening"}
              </span>
            </div>
            <canvas className="mirror-waveform" ref={canvasRef} width={520} height={80} />
            <p className="mirror-muted">
              {transcript
                ? transcript
                : reflection
                ? reflection
                : "Transcript will appear here when audio capture is enabled."}
            </p>
            {recordingMode && (
              <p className="mirror-recording">
                {formatRecordingTime(recordingSeconds)} / 3:00 max
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

              {reportCapabilityNote && (
                <p className="mirror-muted">{reportCapabilityNote}</p>
              )}

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
                <p className="mirror-muted">
                  Reflection output will render here after initiation.
                </p>
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
                      ? idsBlock.identify
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
                      <p className="mirror-insight-value">{idsBlock.identify}</p>
                    </div>
                    <div>
                      <p className="mirror-insight-label">Define</p>
                      <p className="mirror-insight-value">{idsBlock.define}</p>
                    </div>
                  </div>
                  <ul className="mirror-insight-list">
                    {(idsBlock.suggest ?? []).map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* ✅ Debug panel: shows exactly what the server returned */}
              {lastResponse && (
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
                onClick={() => toggleRecording("audio")}
                disabled={isLoading || (recordingMode !== null && recordingMode !== "audio")}
              >
                <span>{recordingMode === "audio" ? "Stop audio" : "Audio record"}</span>
              </button>

              <button
                type="button"
                className="mirror-ghost"
                onClick={() => toggleRecording("video")}
                disabled={isLoading || (recordingMode !== null && recordingMode !== "video")}
              >
                <span>{recordingMode === "video" ? "Stop video" : "Video record"}</span>
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
