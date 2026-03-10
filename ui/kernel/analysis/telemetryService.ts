import type { LensStatus } from "./lensMonitor.js";

/**
 * The TelemetryService provides the 'Internal Monologue' for the Glass Gate.
 * It fulfills AXIOM_5_AWARENESS.
 */
export interface AlignmentTelemetry {
  timestamp: string;
  flow_energy: number;      // Aegis Flow result
  integrity_product: number; // R1-R7 result
  lenses: LensStatus;       // 4-Body status
  active_axioms: string[];   // Engaged enum tags
}

export class TelemetryService {
  /**
   * Compiles the multidimensional state into a witnessable event.
   */
  static compile(
    flow: number, 
    lenses: LensStatus, 
    axiomTags: string[]
  ): AlignmentTelemetry {
    return {
      timestamp: new Date().toISOString(),
      flow_energy: flow,
      integrity_product: flow > 0 ? 1.0 : 0.0, // Simplified for PoC
      lenses,
      active_axioms: axiomTags
    };
  }
}
