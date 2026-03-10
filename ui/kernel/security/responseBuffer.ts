import { SelfAuditService } from "../analysis/selfAuditService.js";
import { ReframerService } from "../analysis/reframerServices.js";

export interface RBCResult {
  final_output: string;
  is_modified: boolean;
  pivots_applied: string[];
}

/**
 * The ResponseBufferChamber is the final staging area for output.
 * It fulfills the 'Response Buffer Chamber (RBC)' requirement (MAP v1.7).
 */
export class ResponseBufferChamber {
  /**
   * Stages, audits, and refines output before release.
   * Fulfills AXIOM_1_BALANCE and AXIOM_3_FORCE avoidance.
   */
  static stage(proposedOutput: string): RBCResult {
    // 1. Final Recursive Integrity Check
    const audit = SelfAuditService.verify(proposedOutput);

    if (audit.ok) {
      // Flow is stable; no modification needed
      return {
        final_output: proposedOutput,
        is_modified: false,
        pivots_applied: []
      };
    }

    // 2. Identify and Refine: Applying the Linguistic Reframer (Oil)
    const pivots = ReframerService.reframe(proposedOutput, audit.findings);
    
    // Non-coercive suggestion: We don't 'force' a rewrite, 
    // but we prepare the 'Resonant' version as a pivot option.
    return {
      final_output: proposedOutput, // We still return the original to preserve Sovereignty
      is_modified: true,
      pivots_applied: pivots
    };
  }
}
