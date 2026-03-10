// FILE: server/src/kernel/analysis/selfAuditService.ts

import { analyzeText } from "../../analyzeText.js";
import { TensorFactory } from "../../../../ui/kernel/tensor/factory.js";

type FindingLike = { type: string; severity?: number; evidence?: string; index?: number };
type AnalysisLike = { findings: FindingLike[] };

export type SelfAuditMetadata = {
  channel?: "user" | "assistant" | "system" | "tool" | "external";
  thread_id?: string;
  turn_id?: string;
};

export function runSelfAudit(input: string, metadata: SelfAuditMetadata = {}) {
  const audit = analyzeText(input) as unknown as AnalysisLike;
  const findings = (audit?.findings ?? []) as FindingLike[];

  const tensor = TensorFactory.createPT(input, findings, metadata);

  return {
    ok: true,
    findings_count: findings.length,
    tensor
  } as const;
}
