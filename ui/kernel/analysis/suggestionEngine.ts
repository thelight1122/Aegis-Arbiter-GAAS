import type { AegisTensor } from "../tensor.js";
import type { AlignmentSnapshot } from "./resonanceServices.js";

export interface IDSReply {
  identify: string;
  define: string;
  reflect: string;
  question?: string;
  acknowledge?: string;
  suggest: string[];
  sequence: "IDR" | "IDQRA";
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter((s) => typeof s === "string" && s.length > 0)));
}

export class SuggestionEngine {
  /**
   * Generates an IDS response block using the Axiom of Reflection.
   * Switches BETWEEN IDR (urgent) and IDQRA (rested) based on intensity.
   */
  static generate(current: AegisTensor, snapshot: AlignmentSnapshot): IDSReply | null {
    const isHighIntensity = snapshot.equilibrium_delta > 0.6 || snapshot.drivers.drift_risk > 0.5;

    // 1. Identify: Name the signal or drift
    const identify = snapshot.resonance_status === "aligned"
      ? "Signal aligned: resonance stable."
      : `Signal drift detected: ${snapshot.resonance_status} state.`;

    // 2. Define: Establish boundary in relation to axioms
    const define = snapshot.resonance_status === "aligned"
      ? "Field maintains AXIOM_1_BALANCE and AXIOM_4_FLOW."
      : `High amplitude detected. Perspective may narrow (AXIOM_9_NARROWING).`;

    // 3. Reflect: Hold the mirror to the observed
    const reflect = snapshot.resonance_status === "aligned"
      ? "Mirror shows coherence and agency."
      : "Mirror reflects pressure seeking to bypass AXIOM_6_CHOICE.";

    const suggest = [
      "Option: Pause to restore equanimity.",
      "Option: Reframe with neutral observation."
    ];

    if (isHighIntensity) {
      // IDR Sequence (Identify, Define, Reflect)
      return {
        identify,
        define,
        reflect,
        suggest,
        sequence: "IDR"
      };
    } else {
      // IDQRA Sequence (Identify, Define, Question, Reflect, Acknowledge)
      return {
        identify,
        define,
        question: "What do you notice in the field at this moment?",
        reflect,
        acknowledge: "This signal is seen and valid in the current interaction.",
        suggest: [...suggest, "Option: Deepen exploration of the resonant pattern."],
        sequence: "IDQRA"
      };
    }
  }
}
