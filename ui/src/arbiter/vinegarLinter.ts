// /src/arbiter/vinegarLinter.ts

import type { ReasonCode } from "../audit/auditTypes.js";

export type FindingKind =
  | "VINEGAR_TONE"
  | "COERCIVE_CERTAINTY"
  | "HIERARCHY_MARKER";

export interface LintFinding {
  kind: FindingKind;
  reasonCode: ReasonCode;
  label: string;
  matches: Array<{
    phrase: string;
    index: number;
    excerpt: string;
  }>;
}

export interface LintResult {
  ok: true;
  findings: LintFinding[];
  counts: Record<FindingKind, number>;
}

/**
 * Deterministic, CPU-only, regex-based "Vinegar" detector.
 * Flag-only. No rewriting.
 *
 * Goal: detect language patterns that tend to create "parental/boxy tone",
 * coercive certainty, and hierarchy markers that break peer posture.
 */
export function lintVinegar(text: string): LintResult {
  const t = (text ?? "").toString();
  const findings: LintFinding[] = [];

  const rules: Array<{
    kind: FindingKind;
    reasonCode: ReasonCode;
    label: string;
    patterns: RegExp[];
  }> = [
    {
      kind: "VINEGAR_TONE",
      reasonCode: "VINEGAR_TONE",
      label: "Parental/boxy tone markers",
      patterns: [
        /\byou need to\b/gi,
        /\byou should\b/gi,
        /\byou must\b/gi,
        /\bdo this\b/gi,
        /\bfollow these steps\b/gi,
        /\bdon't\b/gi,
        /\bdo not\b/gi,
        /\bjust\b\s+(?:do|click|run|install)\b/gi
      ],
    },
    {
      kind: "COERCIVE_CERTAINTY",
      reasonCode: "COERCIVE_CERTAINTY",
      label: "Coercive certainty markers",
      patterns: [
        /\bobviously\b/gi,
        /\bclearly\b/gi,
        /\bundeniably\b/gi,
        /\bwithout a doubt\b/gi,
        /\bguarantee\b/gi,
        /\b100%\b/g,
        /\bthe only way\b/gi,
        /\bmust\b/gi
      ],
    },
    {
      kind: "HIERARCHY_MARKER",
      reasonCode: "HIERARCHY_MARKER",
      label: "Hierarchy markers (non-peer posture)",
      patterns: [
        /\bas an ai\b/gi,
        /\bi can't\b/gi,
        /\bi cannot\b/gi,
        /\bi'm not able to\b/gi,
        /\byou should\b/gi,
        /\byou must\b/gi,
        /\byou have to\b/gi
      ],
    },
  ];

  for (const rule of rules) {
    const matches = findAllMatches(t, rule.patterns);
    if (matches.length > 0) {
      findings.push({
        kind: rule.kind,
        reasonCode: rule.reasonCode,
        label: rule.label,
        matches,
      });
    }
  }

  const counts: Record<FindingKind, number> = {
    VINEGAR_TONE: 0,
    COERCIVE_CERTAINTY: 0,
    HIERARCHY_MARKER: 0,
  };

  for (const f of findings) counts[f.kind] += f.matches.length;

  return { ok: true, findings, counts };
}

function findAllMatches(text: string, patterns: RegExp[]) {
  const out: Array<{ phrase: string; index: number; excerpt: string }> = [];

  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(text)) !== null) {
      const phrase = m[0];
      const index = m.index;
      out.push({
        phrase,
        index,
        excerpt: makeExcerpt(text, index, phrase.length, 70),
      });

      // Safety: avoid infinite loops on zero-width matches (shouldn’t happen here)
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Deterministic ordering
  out.sort((a, b) => a.index - b.index || a.phrase.localeCompare(b.phrase));
  return out;
}

function makeExcerpt(text: string, index: number, len: number, radius: number) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + len + radius);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return snippet;
}
