/**
 * The FrictionLexicon defines the 'Oil' (low-friction) alternatives 
 * for 'Vinegar' (high-friction) markers.
 */
const FrictionLexicon: Record<string, string> = {
  "must": "observe a path to",
  "should": "is a potential for",
  "need to": "could enable",
  "restricted": "bounded",
  "forbidden": "non-resonant",
  "stop": "pause",
  "incorrect": "unaligned",
  "command": "suggest",
  "enforce": "define the channel"
};

/**
 * The ReframerService provides the specific 'How' of re-alignment.
 * It fulfills AXIOM_4_FLOW by offering paths of least resistance.
 */
export class ReframerService {
  /**
   * Identifies high-friction tokens and suggests resonant pivots.
   */
  static reframe(input: string, findings: any[]): string[] {
    const suggestions: string[] = [];

    findings.forEach(finding => {
      // If the finding has a 'text' property (the specific offending word)
      if (finding.evidence) {
        const lowerEvidence = finding.evidence.toLowerCase();
        const pivot = FrictionLexicon[lowerEvidence];
        
        if (pivot) {
          suggestions.push(`Reframe '${finding.evidence}' as '${pivot}' to reduce friction.`);
        }
      }
    });

    return suggestions;
  }
}
