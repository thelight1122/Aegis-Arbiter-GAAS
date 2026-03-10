// src/kernel/evolution.ts

import type { AegisTensor } from "./tensor.js";

export function evaluatePromotion(tensor: AegisTensor): boolean {
  // Logic derived from Section IX of the Codex
  const highResonance = (tensor.state.axes.resonance_index || 0) > 0.8;
  const axiomCorrection = tensor.state.labels.axiom_tags.length > 0;
  const reducedEntropy = (tensor.state.axes.coherence_score || 0) > 0.7;

  // If the interaction corrected a drift or showed high resonance, it is promoted.
  return highResonance || (axiomCorrection && reducedEntropy);
}
