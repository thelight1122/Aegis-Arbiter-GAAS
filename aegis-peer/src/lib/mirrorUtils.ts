// Pure utility functions for MirrorApp — no React dependencies.
import type { AegisEngineResult } from "../components/ReportOutput";

export interface LensValues {
  physical?: number;
  emotional?: number;
  mental?: number;
  spiritual?: number;
}

export function describeLevel(value?: number): string {
  if (typeof value !== "number") return "Unknown";
  if (value >= 0.75) return "High";
  if (value >= 0.45) return "Steady";
  if (value >= 0.25) return "Low";
  return "Depleted";
}

export function levelTone(value?: number): string {
  if (typeof value !== "number") return "unknown";
  if (value >= 0.75) return "strong";
  if (value >= 0.45) return "steady";
  if (value >= 0.25) return "low";
  return "critical";
}

export function normalizeLenses(payload: unknown): LensValues | null {
  if (!payload || typeof payload !== "object") return null;
  const { physical, emotional, mental, spiritual } = payload as LensValues;
  const hasValue = [physical, emotional, mental, spiritual].some(
    (v) => typeof v === "number"
  );
  return hasValue ? { physical, emotional, mental, spiritual } : null;
}

export function formatAlignment(raw: string | null, emotional?: number): string | null {
  if (!raw) return null;

  const match = raw.match(/Delta=([0-9.]+)/i);
  const delta = match ? Number.parseFloat(match[1]) : null;

  if (delta !== null && !Number.isNaN(delta)) {
    if (delta >= 0.8) return "Peer emotional state shows acute tension and destabilization. Focus on grounding and safety.";
    if (delta >= 0.55) return "Peer emotional state shows elevated strain. Provide calm, specific support.";
    if (delta >= 0.3) return "Peer emotional state shows mild friction. Invite reflection and gentle pacing.";
    return "Peer emotional state appears steady. Encourage continued clarity and choice.";
  }

  if (typeof emotional === "number") {
    if (emotional >= 0.75) return "Peer emotional state is energized and expressive. Channel toward constructive action.";
    if (emotional >= 0.45) return "Peer emotional state is stable with manageable tension. Maintain steady support.";
    if (emotional >= 0.25) return "Peer emotional state is low and guarded. Offer reassurance and space.";
    return "Peer emotional state is depleted. Prioritize rest and emotional safety.";
  }

  return raw;
}

export function isReportCapableIds(ids: unknown): ids is AegisEngineResult {
  if (!ids || typeof ids !== "object") return false;
  const obj = ids as Record<string, unknown>;
  const peerWeightsOk =
    Array.isArray(obj.peerWeights) &&
    obj.peerWeights.length === 7 &&
    obj.peerWeights.every((n) => typeof n === "number");
  return (
    peerWeightsOk &&
    typeof obj.logic === "number" &&
    typeof obj.emotion === "number" &&
    typeof obj.moodType === "string" &&
    typeof obj.keyAxiom === "number" &&
    typeof obj.peerSummary === "string" &&
    typeof obj.suggestText === "string" &&
    typeof obj.isFractured === "boolean"
  );
}

export function formatRecordingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
