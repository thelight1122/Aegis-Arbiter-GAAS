import type { AnalysisResult, ToolSettings } from "../types.js";

type AnalyzeRequest = {
  mode: ToolSettings["mode"];
  prompt: string;
  notepad?: string;
};

export async function runAegisAnalysis(
  input: string,
  settings: ToolSettings,
  notepad: string = ""
): Promise<AnalysisResult> {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      flagged: false,
      summary: "No input provided.",
      json: { flagged: false, findings: [] }
    };
  }

  const payload: AnalyzeRequest = {
    mode: settings.mode,
    prompt: trimmed,
    notepad
  };

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
  const res = await fetch(`${apiUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message || data.detail)) ||
      `Server error (${res.status})`;
    throw new Error(msg);
  }

  /**
   * Server envelope shape:
   * {
   *   ok,
   *   mode,
   *   summary,
   *   json: { flagged, counts, score, findings, notes, ... },
   *   timestamp,
   *   elapsed_ms
   * }
   */
  const analyzer = data?.json ?? data;
  const flagged = Boolean(analyzer?.flagged);

  const summary =
    typeof data?.summary === "string"
      ? data.summary
      : flagged
        ? `FLAGGED — ${settings.mode} mode`
        : `CLEAN — ${settings.mode} mode`;

  return {
    flagged,
    summary,
    json: analyzer
  };
}
