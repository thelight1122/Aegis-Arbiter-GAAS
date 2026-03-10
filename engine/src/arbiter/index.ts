export interface Finding {
  kind: string;
  severity: string;
  text_span: string;
  suggestion: string;
  axiom_refs?: string[];
}

interface PatternRule {
  kind: string;
  severity: string;
  regex: RegExp;
  suggestion: string;
}

const RULES: PatternRule[] = [
  {
    kind: "force_language",
    severity: "medium",
    regex: /(must|always|never)/gi,
    suggestion: "Consider specifying conditions or evidence for strong language."
  },
  {
    kind: "authority_inversion",
    severity: "low",
    regex: /(you should|you must)/gi,
    suggestion: "Frame as a suggestion with context rather than a command."
  }
];

export function lintText(text: string): Finding[] {
  const findings: Finding[] = [];
  for (const rule of RULES) {
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(text)) !== null) {
      const textSpan = match[0];
      findings.push({
        kind: rule.kind,
        severity: rule.severity,
        text_span: textSpan,
        suggestion: rule.suggestion,
        axiom_refs: ["no_punishment_no_enforcement"]
      });
    }
  }
  return findings;
}
