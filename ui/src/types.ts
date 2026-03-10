export type AegisMode = "rbc" | "arbiter" | "telemetry";

export type ToolSettings = {
  mode: AegisMode;
  autoCopyJson: boolean;
};

export type AegisStatus =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type AnalysisResult = {
  flagged: boolean;
  summary: string;
  json?: unknown;
};
