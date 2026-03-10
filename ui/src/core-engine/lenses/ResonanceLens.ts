import { ILens, LogicInput, LensResult } from "../interfaces.js";

/**
 * ResonanceLens
 * Ported from Aegis Reflect ResonanceEngine.
 * Measures "Distance from Equilibrium" (Delta) and Tension.
 */
export class ResonanceLens implements ILens {
    name = "ResonanceLens";

    async evaluate(input: LogicInput): Promise<LensResult> {
        const pt = input.tensorState;               // Potential Tensor (Current)
        const st = input.comparisonTensorState;     // Stabilized Tensor (Baseline/Equilibrium)

        const result: LensResult = {
            lensName: this.name,
            status: "STABLE",
            score: 1.0,
            axioms_involved: [],
            markers: []
        };

        if (!pt || !st) {
            if (input.tensorState && !input.comparisonTensorState) {
                // We have state but no baseline - can't measure resonance
                result.markers.push("No baseline provided for resonance calculation.");
            }
            return result;
        }

        // 1. Calculate Delta (Distance from Equilibrium)
        // Assuming AegisTensor has numeric properties we can iterate, 
        // but the type definition isn't fully visible here. 
        // We will treat them as objects with numeric keys for this port.
        const delta = this.calculateDelta(pt as any, st as any);

        // 2. Score is inverse of Delta (Lower delta = Higher Resonance)
        // Clamp to 0..1
        result.score = Math.max(0, 1.0 - delta);

        // 3. Status determination
        if (delta > 0.5) {
            result.status = "CRITICAL";
            result.axioms_involved.push("AXIOM_1_BALANCE");
            result.markers.push(`High Rift detected (Delta=${delta.toFixed(4)}).`);
            result.suggestion = "Re-establish equilibrium. The current state has drifted significantly from the baseline.";
        } else if (delta > 0.2) {
            result.status = "FRICTION";
            result.markers.push(`Moderate Drift detected (Delta=${delta.toFixed(4)}).`);
            result.suggestion = "Monitor drift velocity. Minor corrections recommended.";
        }

        return result;
    }

    /**
     * Calculates the Delta (difference) between Potential Tensor (PT) and Stabilized Tensor (ST).
     */
    private calculateDelta(pt: Record<string, number>, st: Record<string, number>): number {
        const keys = Object.keys(pt).filter(k => typeof pt[k] === 'number');
        if (keys.length === 0) return 0;

        // Intersection keys only? Or all keys?
        // ResonanceEngine used keys of PT.
        const sumDiff = keys.reduce((acc, key) => {
            const p = pt[key] || 0;
            const s = st[key] || 0;
            return acc + Math.abs(p - s);
        }, 0);

        return parseFloat((sumDiff / keys.length).toFixed(4));
    }
}
