import { TensorRepository } from "../../../kernel/storage/tensorRepository.js";

export interface EvolutionTrend {
  sample_count: number;
  drift_velocity: number;   // Rate of change in drift_risk
  coherence_stability: number; // Variance in coherence_score
  observation: string;
}

/**
 * The SovereigntyProgressService tracks evolutionary trajectory.
 * It fulfills the requirement for a 'Progress Map' (Section XII.3).
 */
export class SovereigntyProgressService {
  constructor(private repo: TensorRepository) {}

  /**
   * Calculates the evolution trend from the Logic Spine.
   * Fulfills AXIOM_5_AWARENESS.
   */
  async getEvolutionTrend(sessionId: string): Promise<EvolutionTrend | null> {
    const spine = await this.repo.getSpine(sessionId, 20);

    if (spine.length < 3) return null;

    // Calculate deltas between the oldest and newest ST tensors
    const newest = spine[0];
    const oldest = spine[spine.length - 1];

    const driftDelta = (newest.state.axes.drift_risk || 0) - (oldest.state.axes.drift_risk || 0);
    const coherenceDelta = (newest.state.axes.coherence_score || 0) - (oldest.state.axes.coherence_score || 0);

    // AXIOM_4_FLOW: Identifying if the channel is clearing (negative drift delta)
    const observation = driftDelta < 0 
      ? "Reliance on AXIOM_3_FORCE markers has decreased. AXIOM_4_FLOW is increasing."
      : "Interaction frequency remains in a state of adjustment.";

    return {
      sample_count: spine.length,
      drift_velocity: driftDelta,
      coherence_stability: coherenceDelta,
      observation
    };
  }
}
