export type InteractionVector = "CORRECTNESS" | "POSTURE";

/**
 * The PrismGate classifies the 'Vector' of the incoming signal.
 * It prevents AXIOM_3_FORCE by identifying relational pressure early.
 */
export class PrismGate {
  private static POSTURE_MARKERS = [
    /so what you're saying is/i,
    /are you capable of/i,
    /prove that you/i,
    /why should i trust/i,
    /test/i, // Basic stress-test indicator
  ];

  /**
   * Evaluates the input text to determine the interaction mode.
   */
  static detectVector(input: string): InteractionVector {
    const isPosture = this.POSTURE_MARKERS.some(marker => marker.test(input));
    return isPosture ? "POSTURE" : "CORRECTNESS";
  }
}
