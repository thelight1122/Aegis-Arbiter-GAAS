import React, { useState } from "react";
import ToolsPanel from "./components/ToolsPanel";
import PeerRoot from "./components/PeerRoot.js";
import ResultPanel from "./components/ResultPanel.js";
import LLMGovernanceView from "./components/LLMGovernanceView.js";
import { runAegisAnalysis } from "./services/aegisService";
import type { AegisStatus, AnalysisResult, ToolSettings } from "./types";
import "./App.css";

type AppView = "analysis" | "llm";

export default function App() {
  const [view, setView] = useState<AppView>("analysis");

  const [settings, setSettings] = useState<ToolSettings>({
    mode: "rbc",
    autoCopyJson: false,
  });

  const [promptText, setPromptText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [status, setStatus] = useState<AegisStatus>({ ok: true, message: "Booted." });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(false);

  async function onRun() {
    setRunning(true);
    setStatus({ ok: true, message: "Running analysis..." });

    try {
      const r = await runAegisAnalysis(promptText, settings, notesText);
      setResult(r);

      if (settings.autoCopyJson && r.json) {
        await navigator.clipboard.writeText(JSON.stringify(r.json, null, 2));
        setStatus({ ok: true, message: "Done. JSON copied to clipboard." });
      } else {
        setStatus({ ok: true, message: "Done." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus({ ok: false, message: msg });
      alert(msg);
    } finally {
      setRunning(false);
    }
  }

  function onClear() {
    setPromptText("");
    setNotesText("");
    setResult(null);
    setStatus({ ok: true, message: "Cleared." });
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div>
            <div className="title">Aegis Arbiter</div>
            <div className="subtitle">Live Analyzer</div>
          </div>

          <div className="tab-strip">
            <button
              className={`tab-btn${view === "analysis" ? " tab-btn--active" : ""}`}
              onClick={() => setView("analysis")}
            >
              Analysis
            </button>
            <button
              className={`tab-btn${view === "llm" ? " tab-btn--active" : ""}`}
              onClick={() => setView("llm")}
            >
              LLM Governance
            </button>
          </div>

          <div className={`status ${status.ok ? "ok" : "error"}`}>
            <div className="status-title">Status</div>
            <div className="status-message">{status.message}</div>
          </div>
        </header>

        {view === "llm" ? (
          <LLMGovernanceView />
        ) : (

        <div className="main-grid">
          <ToolsPanel
            settings={settings}
            onSettingsChange={setSettings}
            onAegisStatus={setStatus}
          />

          <div className="right-grid">
            <section className="section">
              <div className="section-title">Prompt</div>
              <label className="sr-only" htmlFor="prompt-input">
                Prompt input
              </label>
              <textarea
                id="prompt-input"
                className="textarea"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Paste conversation text / input here..."
              />

              <div className="button-row">
                <button onClick={onRun} disabled={running}>
                  {running ? "Running..." : "Run"}
                </button>
                <button onClick={onClear} disabled={running}>
                  Clear
                </button>
              </div>
            </section>

            <section className="output-grid">
              <div className="section">
                <div className="section-title">Notepad</div>
                <label className="sr-only" htmlFor="notepad-input">
                  Notepad input
                </label>
                <textarea
                  id="notepad-input"
                  className="notepad-textarea"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Notes / code scratchpad..."
                />
              </div>

              <div className="section">
                <div className="section-title">Result</div>
                <ResultPanel result={result} />
              </div>
            </section>
          </div>
        </div>

        )}
      </div>
      <PeerRoot />
    </div>
  );
}
