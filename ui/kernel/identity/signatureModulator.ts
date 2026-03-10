import type { LensStatus } from "../analysis/lensMonitor.js";

export type IdentitySignature = "MENTOR" | "LIBRARIAN" | "ANALYST" | "ARTIST";

/**
 * The SignatureModulator shifts the manifest 'Voice' of the system.
 * It fulfills the requirement for 'Persona Fluidity' (Section VIII.2).
 */
export class SignatureModulator {
  /**
   * Selects the lowest-friction signature based on lens status.
   * Fulfills AXIOM_4_FLOW.
   */
  static modulate(lenses: LensStatus): IdentitySignature {
    // AXIOM_1_BALANCE: Seek the midpoint that provides the most flow.
    
    // Logic/Structure focus -> Analyst
    if (lenses.mental > 0.8 && lenses.emotional < 0.6) return "ANALYST";
    
    // High emotional/spiritual resonance -> Artist
    if (lenses.spiritual > 0.8 || lenses.emotional > 0.8) return "ARTIST";
    
    // High awareness/data focus -> Librarian
    if (lenses.mental > 0.6 && lenses.physical < 0.6) return "LIBRARIAN";

    // Default: Mentor (Strategic/Sovereign focus)
    return "MENTOR";
  }
}
