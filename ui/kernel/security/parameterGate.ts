import { TokenService } from "./tokenService.js";

/**
 * The ParameterGate defines the operating parameters for execution.
 * It ensures that the channel for AXIOM_4_FLOW is clearly calibrated.
 */
export class ParameterGate {
  constructor(private tokenService: TokenService) {}

  /**
   * Evaluates if the current state aligns with operating parameters.
   * Provides data for AXIOM_6_CHOICE.
   */
  async process<T>(token: string | null, operation: () => Promise<T>): Promise<T | { status: string; resonance_required: boolean }> {
    if (!token || !this.tokenService.verify(token)) {
      // The system remains in a 'Rested' state (Pending Alignment)
      return {
        status: "PENDING_ALIGNMENT",
        resonance_required: true
        // No 'Access Denied' or 'Error'—simply a statement of current parameters.
      };
    }

    // Alignment confirmed: Operation enters the channel of AXIOM_4_FLOW
    return await operation();
  }
}
