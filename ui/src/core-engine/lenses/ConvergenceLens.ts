import { ILens, LogicInput, LensResult } from "../interfaces.js";
import { LensMonitor } from "../../../kernel/analysis/lensMonitor.js"; // Adjust path as needed

/**
 * ConvergenceLens
 * Ported from Aegis Arbiter ConvergenceEngine.
 * precise relational equilibrium between two sovereign states.
 */
export class ConvergenceLens implements ILens {
    name = "ConvergenceLens";

    async evaluate(input: LogicInput): Promise<LensResult> {
        const tensorA = input.tensorState;
        const tensorB = input.comparisonTensorState;

        const result: LensResult = {
            lensName: this.name,
            status: "STABLE",
            score: 1.0,
            axioms_involved: [],
            markers: []
        };

        // If we don't have two tensors to compare, this lens matches nothing.
        if (!tensorA || !tensorB) {
            return result;
        }

        const statusA = LensMonitor.evaluate(tensorA);
        const statusB = LensMonitor.evaluate(tensorB);

        // Calculate friction (Emotional Delta)
        const frictionDelta = Math.abs(statusA.emotional - statusB.emotional);

        // Calculate Mental Delta
        const mentalDelta = Math.abs(statusA.mental - statusB.mental);

        // Default score is inverse of friction (High friction = Low score)
        result.score = Math.max(0, 1.0 - frictionDelta);

        if (frictionDelta > 0.5) {
            result.status = "FRICTION";
            result.axioms_involved.push("AXIOM_3_FORCE");
            result.markers.push(`Significant relational friction detected (Delta=${frictionDelta.toFixed(2)}).`);
        }

        if (mentalDelta > 0.6) {
            result.status = Math.max(result.score, 0.4) < 0.5 ? "CRITICAL" : "FRICTION"; // Critical if combined with other factors
            if (!result.axioms_involved.includes("AXIOM_2_EXTREMES")) {
                result.axioms_involved.push("AXIOM_2_EXTREMES");
            }
            result.markers.push(`Polarized mental lenses detected (Delta=${mentalDelta.toFixed(2)}).`);
        }

        if (result.status !== "STABLE") {
            result.suggestion = "Seek common ground. The gap in emotional or mental frequency is creating resistance.";
        }

        return result;
    }
}
