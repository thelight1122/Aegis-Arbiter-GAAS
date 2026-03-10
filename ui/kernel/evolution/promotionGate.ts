import type { AegisTensor } from "../tensor.js";

/**
 * The PromotionGate identifies PTs eligible for the Logic Spine (ST).
 * This fulfills the 'Evolution' requirement without force.
 */
export class PromotionGate {
  /**
   * Evaluates if a Peer Tensor (PT) should be promoted to a Spine Tensor (ST).
   */
  static evaluate(tensor: AegisTensor): boolean {
    // 1. Threshold for Salience: Did this turn have high structural impact?
    const isSalient = (tensor.state.axes.salience_weight || 0) > 0.7;

    // 2. Threshold for Coherence: Does this turn reinforce AXIOM_1_BALANCE?
    const isCoherent = (tensor.state.axes.coherence_score || 0) > 0.8;

    // 3. Threshold for Low Drift: Is the signal clear of AXIOM_3_FORCE?
    const lowDrift = (tensor.state.axes.drift_risk || 0) < 0.3;

    // Promotion occurs if the PT is salient, coherent, and low-drift.
    return isSalient && isCoherent && lowDrift;
  }
}
