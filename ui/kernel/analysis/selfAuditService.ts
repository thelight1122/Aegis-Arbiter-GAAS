// FILE: server/src/kernel/analysis/selfAuditService.ts
// NodeNext/ESM rule: use .js extensions in relative imports

import { analyzeText } from "../../src/analyzeText.js";
import { TensorFactory } from "../tensor/factory.js";

type FindingLike = {
  type: string;
  severity?: number;
  evidence?: string;
  index?: number;
};

type AnalysisLike = {
  findings: FindingLike[];
};

export type SelfAuditMetadata = {
  channel?: "user" | "assistant" | "system" | "tool" | "external";
  thread_id?: string;
  turn_id?: string;
};

export type SelfAuditResult = {
  ok: true;
  findings_count: number;
  tensor: ReturnType<typeof TensorFactory.createPT>;
};

/**
 * Runs analyzer on input and produces a Peer Tensor (PT) representing the audit state.
 */
export function runSelfAudit(input: string, metadata: SelfAuditMetadata = {}): SelfAuditResult {
  // analyzeText shape differs across builds; we cast minimally to avoid type-lock.
  const audit = analyzeText(input) as unknown as AnalysisLike;

  const findings = (audit?.findings ?? []) as FindingLike[];

  // Example derived signal (kept, but now typed to avoid TS7006)
  const hasForce = findings.some((f: FindingLike) => f.type === "force_language");

  // If you want to use hasForce later, it’s here. Keeping it prevents “unused” refactors later.
  void hasForce;

  const tensor = TensorFactory.createPT(input, findings, metadata);

  return {
    ok: true,
    findings_count: findings.length,
    tensor
  };
}

export class SelfAuditService {
  /**
   * Evaluates proposed system output for Force or Drift.
   * Fulfills AXIOM_3_FORCE avoidance.
   */
  static verify(proposedOutput: string): { ok: boolean; findings: FindingLike[] } {
    const audit = analyzeText(proposedOutput) as unknown as AnalysisLike;
    const findings = (audit?.findings ?? []) as FindingLike[];

    const hasForce = findings.some(
      (f) => f.type === "hierarchy_inference" || f.type === "force_language"
    );

    return {
      ok: !hasForce,
      findings
    };
  }
}
