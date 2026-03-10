import React, { useState } from "react";
import type { AnalysisResult } from "../types.js";

interface Props {
  result: AnalysisResult | null;
}

export default function ResultPanel({ result }: Props) {
  const [showJson, setShowJson] = useState(false);

  if (!result) return <div>Run analysis to see results.</div>;

  const analyzer = (result.json ?? null) as Record<string, unknown> | null;
  const summaryText = result.summary ?? "";
  const scoreTotal = (analyzer?.score as { total?: number })?.total ?? 0;
  const findingsArr = Array.isArray(analyzer?.findings) ? analyzer.findings : [];
  const notesArr = Array.isArray(analyzer?.notes) ? analyzer.notes : [];
  const countsObj = (analyzer?.counts ?? {}) as Record<string, unknown>;
  const nonZeroCounts = Object.entries(countsObj).filter(([, v]) => Number(v) > 0);
  const jsonText = analyzer ? JSON.stringify(analyzer, null, 2) : "";

  return (
    <div className="result-stats">
      <div className="result-summary">
        <b>Summary:</b> {summaryText || "(none)"}
      </div>

      <div className="result-badges">
        <span className="badge">
          <b>Score</b>: {scoreTotal}
        </span>
        <span className="badge">
          <b>Findings</b>: {findingsArr.length}
        </span>
        <span className={`badge ${result.flagged ? "badge-bad" : "badge-good"}`}>
          <b>Status</b>: {result.flagged ? "FLAGGED" : "CLEAN"}
        </span>
      </div>

      <div className="counts-block">
        <div className="counts-title">Non-zero counts</div>
        <div className="counts-line">
          {nonZeroCounts.length ? (
            nonZeroCounts.map(([k, v]) => (
              <span key={k} className="chip">
                {k}: {String(v)}
              </span>
            ))
          ) : (
            <span className="muted">(none)</span>
          )}
        </div>
      </div>

      <div className="notes-block">
        <div className="counts-title">Notes</div>
        {notesArr.length ? (
          <ul className="notes-list">
            {(notesArr as string[]).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <div className="muted">(none)</div>
        )}
      </div>

      <div className="json-toggle-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => setShowJson((v) => !v)}
        >
          {showJson ? "Hide JSON" : "Show JSON"}
        </button>
      </div>

      {showJson && <pre className="output-pre">{jsonText}</pre>}
    </div>
  );
}
