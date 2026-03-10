import crypto from "node:crypto";
import type { AegisTensor, TensorType } from "../tensor.js";

// Canon allowlist (kernel-locked). Expand only via canon-pack update.
const ALLOWED_AXIOM_TAGS = new Set<string>([
  "AXIOM_1_BALANCE",
  "AXIOM_2_EXTREMES",
  "AXIOM_3_FORCE",
  "AXIOM_4_FLOW",
  "AXIOM_5_AWARENESS",
  "AXIOM_6_CHOICE",
]);

type Finding = {
  severity?: number;          // 0..1 preferred, but we guard either way
  axiom_tag?: string;         // may be invalid / hallucinated
  type?: string;              // optional finding type string
};

export class TensorFactory {
  /**
   * Deterministic tensor generation from raw input + findings.
   * NOTE: This is a factory, not an interpreter. Keep it boring and reliable.
   */
  static generate(
    input: string,
    findings: Finding[],
    type: TensorType = "PT"
  ): AegisTensor {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const safeFindings = Array.isArray(findings) ? findings : [];

    // Drift risk: bounded accumulator.
    const driftAxisRaw = safeFindings.reduce((acc, f) => {
      const s = typeof f?.severity === "number" ? f.severity : 0.1;
      return acc + s;
    }, 0);

    const drift_risk = Math.min(Math.max(driftAxisRaw, 0), 1);

    // Salience: basic heuristic, deterministic.
    const salience_weight = safeFindings.length > 0 ? 0.8 : 0.3;

    // Coherence:
    // - If you want coherence on PT, keep it as a coarse heuristic (fine).
    // - If you want coherence only on ST, set undefined for PT.
    // For now: keep your original intent (coarse coherence), but bounded.
    const coherence_score =
      safeFindings.length === 0 ? 0.9 : 0.5;

    // Canon-bound axiom tags only.
    const axiom_tags = safeFindings
      .map((f) => f?.axiom_tag)
      .filter((t): t is string => typeof t === "string" && ALLOWED_AXIOM_TAGS.has(t));

    const hash = crypto
      .createHash("sha256")
      .update(input ?? "")
      .digest("hex")
      .slice(0, 16);

    return {
      tensor_id: id,
      tensor_type: type,
      version: "1.0.0",
      created_at: now,

      source: {
        channel: "user",
      },

      state: {
        payload: {
          text: input,
          hash,
        },

        axes: {
          temporal_proximity: 1.0,
          context_scope: "moment",
          drift_risk,
          coherence_score,
          salience_weight,
        },

        labels: {
          axiom_tags,
          origin_integrity: "observed",
          confidence: 0.9,
        },
      },

      lifecycle: {
        ttl_seconds: type === "PT" ? 3600 : 0,
        decay_rate: type === "PT" ? 0.05 : 0,
        pinned: false,
      },
    };
  }
}
