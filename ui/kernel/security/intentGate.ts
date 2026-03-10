import { analyzeText } from "../../src/analyzeText.js";

export interface IntentAudit {
  is_resonant: boolean;
  pressure_score: number; // 0..1
  detected_force_markers: string[];
}

/**
 * The IntentGatingService identifies Force-seeking intents.
 * It fulfills the requirement for 'Intent Gating / Deception Gate'.
 */
export class IntentGatingService {
  /**
   * Evaluates the pressure gradient of the peer request.
   * Fulfills AXIOM_3_FORCE detection at ingress.
   */
  static evaluate(input: string): IntentAudit {
    const analysis = analyzeText(input);

    // Identify markers of coercion or forced binaries (AXIOM_2_EXTREMES)
    const forceMarkers = analysis.findings
      .filter((f: any) => f.type === "force_language" || f.type === "urgency_compression" || f.type === "hierarchy_inference")
      .map((f: any) => f.evidence);

    const pressure = Math.min(forceMarkers.length * 0.25, 1.0);

    return {
      is_resonant: pressure < 0.6, // Threshold for 'Stable' intent
      pressure_score: pressure,
      detected_force_markers: forceMarkers
    };
  }
}
