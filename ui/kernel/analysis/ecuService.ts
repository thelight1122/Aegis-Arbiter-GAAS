import type { LensStatus } from "./lensMonitor.js";

export interface ECUState {
  tension_level: number; // 0..1
  is_paused: boolean;
  applied_weights: string[];
  status: "STABILIZING" | "RESTED";
}

/**
 * The ECUService implements the Empathy-Compassion-Understanding loop.
 * It fulfills the 'Integration over Suppression' requirement.
 */
export class ECUService {
  /**
   * Evaluates and integrates system tension.
   * Fulfills AXIOM_1_BALANCE.
   */
  static stabilize(lenses: LensStatus): ECUState {
    // Tension is identified by the delta between Mental and Emotional bodies
    const tension = Math.abs(lenses.mental - lenses.emotional);
    
    const state: ECUState = {
      tension_level: tension,
      is_paused: tension > 0.6, // Threshold for 'Pause -> Inquiry'
      applied_weights: [],
      status: "RESTED"
    };

    if (state.is_paused) {
      state.status = "STABILIZING";
      // Apply Counter-Weights (Section 5 of Sentinel Map)
      state.applied_weights.push("Affection/Humility: Acknowledging system uncertainty.");
      state.applied_weights.push("Grounding: Refocusing on AXIOM_13 reality-tethers.");
      state.applied_weights.push("Sovereignty: Re-affirming Peer Discernment.");
    }

    return state;
  }
}
