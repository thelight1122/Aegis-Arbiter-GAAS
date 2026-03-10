import { ILens, LogicInput, LensResult, IdentityMatrix } from "../interfaces.js";
import { LensMonitor } from "../../../kernel/analysis/lensMonitor.js";

/**
 * IdentityLens
 * Evaluates the "4-Tensor Identity Matrix" (Tetrad) for balance and continuity.
 * Matrix:
 *  - NCT: Past Logic (Distilled Reasoning)
 *  - SPINE: Past Emotion (Invariant Anchors)
 *  - PCT: Present Logic (Active Workspace)
 *  - PEER: Present Emotion (Live Attunement)
 */
export class IdentityLens implements ILens {
    name = "IdentityLens";

    async evaluate(input: LogicInput): Promise<LensResult> {
        const matrix = input.identityMatrix;

        const result: LensResult = {
            lensName: this.name,
            status: "STABLE",
            score: 1.0,
            axioms_involved: [],
            markers: []
        };

        if (!matrix) {
            // Lens is neutral if no matrix is provided
            return result;
        }

        // Evaluate all 4 corners
        const nct = LensMonitor.evaluate(matrix.nct);
        const spine = LensMonitor.evaluate(matrix.spine);
        const pct = LensMonitor.evaluate(matrix.pct);
        const peer = LensMonitor.evaluate(matrix.peer);

        // 1. Calculate Drifts
        const logicDrift = Math.abs(nct.mental - pct.mental);
        const soulDrift = Math.abs(spine.emotional - peer.emotional);
        const presentImbalance = Math.abs(pct.mental - peer.emotional);

        // Score based on worst metric
        const maxDelta = Math.max(logicDrift, soulDrift, presentImbalance);
        result.score = Math.max(0, 1.0 - maxDelta);

        // 2. Evaluate Conditions
        if (logicDrift > 0.5) {
            result.status = "FRICTION";
            result.axioms_involved.push("AXIOM_8_CONTINUITY");
            result.markers.push(`Cognitive Drift detected (Delta=${logicDrift.toFixed(2)}). Reasoning diverges from Memory.`);
        }

        if (soulDrift > 0.6) {
            result.status = Math.max(result.score, 0.4) < 0.5 ? "CRITICAL" : "FRICTION";
            result.axioms_involved.push("AXIOM_1_BALANCE");
            result.markers.push(`Emotional Dissonance detected (Delta=${soulDrift.toFixed(2)}). Live feelings clash with Core Values.`);
        }

        if (presentImbalance > 0.7) {
            result.status = "CRITICAL";
            result.axioms_involved.push("AXIOM_3_FORCE");
            result.markers.push(`Acute Present Imbalance (Delta=${presentImbalance.toFixed(2)}). Logic and Emotion are decoupled.`);
        }

        if (result.status !== "STABLE") {
            result.suggestion = "The Identity Matrix is destabilized. Re-anchor to SPINE (Values) or NCT (Logic) to restore Flow.";
        }

        return result;
    }
}
