export type Mode = "rbc" | "arbiter" | "lint";

export type AnalyzeRequest = {
  mode: Mode;
  prompt: string;
  notepad: string;
};

export type AnalyzeResponse = {
  ok: boolean;
  mode: Mode;
  summary: string;
  json: unknown;
  timestamp: string;
  elapsed_ms?: number;
};

export type PingResponse = {
  ok: boolean;
  status: "ready" | "degraded";
  detail?: string;
  timestamp: string;
};
