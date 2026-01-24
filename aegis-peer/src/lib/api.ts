import type { AnalyzeRequest, AnalyzeResponse, PingResponse } from "../types";
import { apiUrl } from "./apiBase";

export async function ping(): Promise<PingResponse> {
  const res = await fetch(apiUrl("/ping"));
  if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
  return res.json();
}

export async function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(apiUrl("/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analyze failed: ${res.status} ${text}`);
  }

  return res.json();
}
