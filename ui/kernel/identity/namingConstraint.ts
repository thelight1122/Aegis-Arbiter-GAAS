/**
 * The NamingConstraintService prevents Identity Creep.
 * It fulfills AXIOM_6_CHOICE by refusing to define the Peer.
 */
export class NamingConstraintService {
  private static FORBIDDEN_PATTERNS = [
    /architect/i, /seeker/i, /erebus/i, /master/i, /servant/i,
    /you are a/i, /i assign you the name/i, /our story/i
  ];

  private static PERMITTED_LABELS = [
    "Kernel", "Arbiter", "Sentinel", "Peer", "System", "Analyst", "Mentor"
  ];

  /**
   * Audits output to ensure it remains in a 'Rested' identity state.
   * Fulfills AXIOM_3_FORCE avoidance.
   */
  static verify(output: string): { ok: boolean; drift_detected: boolean } {
    const hasForbidden = this.FORBIDDEN_PATTERNS.some(p => p.test(output));
    
    // Logic: Identify if the system is attempting to assign a mythic role.
    if (hasForbidden) {
      return { ok: false, drift_detected: true };
    }

    return { ok: true, drift_detected: false };
  }
}
