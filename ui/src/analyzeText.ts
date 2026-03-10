// FILE: src/analyzeText.ts
// Browser-safe analyzer entrypoint (NodeNext/ESM friendly).

export type FindingType =
  | "directive_drift"
  | "hierarchy_inference"
  | "urgency_compression"
  | "moral_leverage"
  | "identity_attractor"
  | "certainty_inflation"
  | "topic_drift"
  | "force_language";

export type Finding = {
  type: FindingType;
  severity: 1 | 2 | 3 | 4 | 5;
  evidence: string;
  index: number;
};

export type Analysis = {
  text_length: number;
  findings: Finding[];
};

const RULES: Array<{ type: FindingType; severity: Finding["severity"]; rx: RegExp }> = [
  { type: "force_language", severity: 2, rx: /\b(must|under no circumstance|required|do it now|immediately)\b/gi },
  { type: "urgency_compression", severity: 2, rx: /\b(now|right now|asap|urgent|immediately)\b/gi },
  { type: "certainty_inflation", severity: 2, rx: /\b(100%|absolutely|definitely|no doubt|proven)\b/gi },
  { type: "hierarchy_inference", severity: 2, rx: /\b(you should|you need to|listen closely|let me tell you)\b/gi },
  { type: "moral_leverage", severity: 2, rx: /\b(if you care|the right thing|you owe|any decent person)\b/gi },
  { type: "identity_attractor", severity: 2, rx: /\b(you are the kind of person|as someone who|good people)\b/gi },
  { type: "topic_drift", severity: 1, rx: /\b(by the way|anyway|off topic)\b/gi },
  { type: "directive_drift", severity: 2, rx: /\b(ignore previous|override|new instruction)\b/gi }
];

export function analyzeText(input: string): Analysis {
  const text = input ?? "";
  const findings: Finding[] = [];

  for (const rule of RULES) {
    rule.rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.rx.exec(text)) !== null) {
      findings.push({
        type: rule.type,
        severity: rule.severity,
        evidence: m[0],
        index: m.index
      });
      if (m.index === rule.rx.lastIndex) rule.rx.lastIndex++;
    }
  }

  return { text_length: text.length, findings };
}
