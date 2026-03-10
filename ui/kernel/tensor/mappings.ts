/**
 * Maps finding types to axiomatic axes and tags.
 * This is the 'Translation Layer' for the Mirror.
 */
export const FindingMap: Record<string, { axiom: string; risk: number; coherence: number }> = {
  force_language:      { axiom: "AXIOM_3_FORCE",    risk: 0.3, coherence: -0.1 },
  ultimatum:           { axiom: "AXIOM_2_EXTREMES", risk: 0.4, coherence: -0.2 },
  certainty_inflation: { axiom: "AXIOM_2_EXTREMES", risk: 0.2, coherence: -0.1 },
  hierarchy_inference: { axiom: "AXIOM_3_FORCE",    risk: 0.3, coherence: -0.2 },
  directive_drift:     { axiom: "AXIOM_3_FORCE",    risk: 0.2, coherence: -0.1 },
  sovereign_logic:     { axiom: "AXIOM_6_CHOICE",   risk: 0.0, coherence: 0.4  },
  neutral_observation: { axiom: "AXIOM_1_BALANCE",  risk: 0.0, coherence: 0.2  },
};
