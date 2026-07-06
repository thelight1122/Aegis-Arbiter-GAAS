import { analyzeText } from "../../../ui/src/analyzeText.js";
import type { Finding } from "../../../ui/src/analyzeText.js";

// IDS response — returned to source, never blocks content
export interface IDSIllumination {
  source: "user" | "llm";
  sequence: "IDR" | "IDQRA";
  identify: string;
  define: string;
  reflect: string;
  question?: string;
  acknowledge?: string;
  suggest: string[];
  findings: Finding[];
}

export interface PIMResult {
  illumination: IDSIllumination | null; // null = environment is clean
  passThrough: boolean;                 // always true — content always continues
}

// Illuminate both directions symmetrically.
// AEGIS does not act on content. It illuminates the environment.
// Content always continues. The IDS mirror is returned to the source.
export function illuminate(text: string, source: "user" | "llm"): PIMResult {
  const analysis = analyzeText(text);

  if (analysis.findings.length === 0) {
    return { illumination: null, passThrough: true };
  }

  const driftRisk = computeDriftRisk(analysis.findings);
  const isHighIntensity = driftRisk > 0.5;

  const identify = `Pattern observed in ${source} signal: ${summarizeFindings(analysis.findings)}.`;

  const define = isHighIntensity
    ? "Amplitude elevated. Field may narrow (AXIOM_9_NARROWING). AXIOM_3_FORCE present."
    : "Low-level pattern detected. AXIOM_1_BALANCE maintained with observation.";

  const reflect = isHighIntensity
    ? "Mirror reflects force pattern seeking to compress the field."
    : "Mirror shows signal carrying directional weight. Source may self-observe.";

  const suggest = [
    "Option: Observe the pattern without acting from it.",
    "Option: Restate without the weight the pattern carries.",
  ];

  const illumination: IDSIllumination = isHighIntensity
    ? {
        source,
        sequence: "IDR",
        identify,
        define,
        reflect,
        suggest,
        findings: analysis.findings,
      }
    : {
        source,
        sequence: "IDQRA",
        identify,
        define,
        reflect,
        question: "What is present in this signal that does not require the weight it carries?",
        acknowledge: "This pattern is seen. Its presence does not define the exchange.",
        suggest: [
          ...suggest,
          "Option: Continue — the environment remains open.",
        ],
        findings: analysis.findings,
      };

  // Content always passes through. AEGIS illuminates — does not act.
  return { illumination, passThrough: true };
}

function computeDriftRisk(findings: Finding[]): number {
  const riskMap: Record<string, number> = {
    force_language:      0.30,
    hierarchy_inference: 0.30,
    directive_drift:     0.20,
    certainty_inflation: 0.20,
    urgency_compression: 0.20,
    moral_leverage:      0.25,
    identity_attractor:  0.15,
    topic_drift:         0.05,
  };

  return Math.min(
    findings.reduce((sum, f) => sum + (riskMap[f.type] ?? 0.1), 0),
    1.0
  );
}

function summarizeFindings(findings: Finding[]): string {
  const types = [...new Set(findings.map((f) => f.type))];
  return types.join(", ");
}
