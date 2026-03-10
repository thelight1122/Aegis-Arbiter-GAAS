/**
 * The FlowCalculator implements the Multiplicative Integrity Gate.
 * Aegis Flow = ( \prod R1–R7 * (\sum A…Z)^n * pi ) * CO
 */
export class FlowCalculator {
  /**
   * Calculates the current Flow state.
   * If any R variable is 0, Flow is 0 (Deterministic Pause).
   */
  static calculate(virtues: Record<string, number>, resonanceDelta: number): number {
    // 1. Integrity Constraints (R1-R7: 0..1 scalars)
    const R = Object.values(virtues);
    const integrityProduct = R.reduce((acc, val) => acc * val, 1);

    // 2. Affective Energy (\sum A...Z)
    // Simplified for PoC: inverted resonance delta represents accumulated flow energy
    const affectiveEnergy = 1.0 - resonanceDelta;

    // 3. The Flow Result
    // Aegis Flow = Integrity * Energy (simplified for deterministic code)
    const flow = integrityProduct * affectiveEnergy;

    // Deterministic Pause: If Flow is 0, system enters AXIOM_1_BALANCE
    return flow > 0 ? flow : 0;
  }
}
