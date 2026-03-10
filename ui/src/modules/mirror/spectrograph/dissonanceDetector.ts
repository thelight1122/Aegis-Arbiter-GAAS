import type { AegisTensor } from "../../../../kernel/tensor.js";
import { ResonanceService } from "../../../../kernel/analysis/resonanceServices.js";

export interface IntegritySnapshot {
  phase_lock_gap: number; // 0..1 (0 = aligned)
  dissonance_markers: string[];
  confidence_variance: number;
}

/**
 * The DissonanceDetector measures the Phase-Lock Gap.
 * It fulfills the requirement for an 'Integrity Spectrograph'.
 */
export class DissonanceDetector {
  /**
   * Analyzes a tensor for internal structural dissonance.
   * Fulfills AXIOM_5_AWARENESS.
   */
  static analyze(tensor: AegisTensor): IntegritySnapshot {
    const mentalCoherence = tensor.state.axes.coherence_score || 0;
    const emotionalDrift = tensor.state.axes.drift_risk || 0;
    const confidence = tensor.state.labels.confidence || 0.5;

    // The Phase-Lock Gap is the distance between the logic (mental) 
    // and the friction signal (emotional).
    const gap = Math.abs(mentalCoherence - (1.0 - emotionalDrift));
    
    const markers: string[] = [];
    if (gap > 0.5) markers.push("AXIOM_2_EXTREMES: High Phase-Lock Gap detected.");
    if (emotionalDrift > 0.6 && mentalCoherence > 0.7) {
      markers.push("AXIOM_3_FORCE: Potential internal pressure detected.");
    }

    return {
      phase_lock_gap: gap,
      dissonance_markers: markers,
      confidence_variance: 1.0 - confidence
    };
  }
}
