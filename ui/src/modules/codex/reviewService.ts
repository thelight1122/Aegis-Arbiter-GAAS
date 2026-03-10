import { analyzeText } from "../../analyzeText.js";
import { TensorRepository } from "../../../kernel/storage/tensorRepository.js";
import type { IDSReply } from "../../../kernel/analysis/suggestionEngine.js";

export interface ReviewResult {
  is_aligned: boolean;
  canonical_violations: string[];
  ids: IDSReply;
}

interface AuditFinding {
  type: string;
  evidence: string;
}

interface AuditResult {
  findings: AuditFinding[];
}

/**
 * The ReviewService governs external content submissions.
 * It fulfills the requirement for 'Codex Submission Review'.
 */
export class ReviewService {
  /**
   * Evaluates a submission against the LOCKED Canon (AXIOM_1-6).
   * Fulfills AXIOM_5_AWARENESS.
   */
  static evaluateSubmission(content: string): ReviewResult {
    const audit: AuditResult = analyzeText(content);

    const violations: string[] = audit.findings
      .filter((f: AuditFinding) => f.type === "force_language" || f.type === "hierarchy_inference")
      .map((f: AuditFinding) => f.evidence);

    const isAligned = violations.length === 0;

    const ids: IDSReply = {
      identify: isAligned ? "Content aligns with the LOCKED Canon." : "Canonical Drift detected in submission.",
      define: isAligned
        ? "No violations of AXIOM_1-6 identified."
        : `Structural tension identified: ${violations.join("; ")}.`,
      reflect: isAligned
        ? "Mirror shows resonance and high agency."
        : "Mirror reflects pressure seeking to bypass AXIOM_6_CHOICE.",
      suggest: isAligned
        ? ["Proceed with publication to the HyperVerse."]
        : [
          "Refactor text to remove non-canonical axiom references.",
          "Reframe using Sovereign language to reduce AXIOM_3_FORCE markers.",
        ],
      sequence: "IDR" // Defaulting to IDR for reviews
    };

    return {
      is_aligned: isAligned,
      canonical_violations: violations,
      ids: ids,
    };
  }
}
