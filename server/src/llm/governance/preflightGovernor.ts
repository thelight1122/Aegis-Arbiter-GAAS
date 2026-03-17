// FILE: server/src/llm/governance/preflightGovernor.ts
//
// Pure async function — stateless. Stateful collaborators (TensorRepository)
// are passed as parameters. No class instantiation needed.

import type { SessionId, PreflightResult } from "./GovernanceTypes.js";
import { analyzeText }           from "../../analyzeText.js";
import { IntentGatingService }   from "../../../../ui/kernel/security/intentGate.js";
import { TensorFactory }         from "../../../../ui/kernel/tensor/factory.js";
import type { TensorRepository } from "../../../../ui/kernel/storage/tensorRepository.js";

/**
 * Runs pre-flight governance on the user's prompt:
 *  1. IntentGatingService.evaluate() — AXIOM_3_FORCE pressure check
 *  2. analyzeText()                  — lint findings (force_language, etc.)
 *  3. TensorFactory.createPT()       — build prompt tensor
 *  4. repo.save()                    — 1 synchronous SQLite write
 *
 * Returns a PreflightResult. Never throws — errors are caught and surfaced
 * as zero-risk results so a governance failure never blocks the LLM call.
 */
export async function runPreflight(
  prompt:    string,
  sessionId: SessionId,
  repo:      TensorRepository,
): Promise<PreflightResult> {
  try {
    // 1. Intent gate — pressure score + resonance check
    const intent   = IntentGatingService.evaluate(prompt);

    // 2. Axiom text analysis — finds force_language, urgency_compression, etc.
    const analysis = analyzeText(prompt);
    const findings = (analysis?.findings ?? []).map((f) => ({
      type:     f.type     ?? "unknown",
      severity: f.severity ?? 0,
      evidence: f.evidence ?? "",
    }));

    // 3. Build prompt tensor (pure, no side effects)
    const tensor = TensorFactory.createPT(prompt, analysis?.findings ?? [], {
      channel: "user",
    });

    // 4. Persist tensor (1 synchronous SQLite write)
    repo.save(sessionId, tensor);

    return {
      pressure_score: intent.pressure_score,
      is_resonant:    intent.is_resonant,
      findings,
      tensor_id:      tensor.tensor_id,
    };
  } catch (err) {
    // Governance failures must never block the LLM call.
    console.error("[preflightGovernor] error:", err instanceof Error ? err.message : err);
    return {
      pressure_score: 0,
      is_resonant:    true,
      findings:       [],
      tensor_id:      "",
    };
  }
}
