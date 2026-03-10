import { ILens, LogicInput, LogicVerdict, LensResult } from "./interfaces.js";
import { IntegrityLens } from "./lenses/IntegrityLens.js";
import { ConvergenceLens } from "./lenses/ConvergenceLens.js";
import { ResonanceLens } from "./lenses/ResonanceLens.js";
import { IdentityLens } from "./lenses/IdentityLens.js";

/**
 * CoreEngine
 * Orchestrates the evaluation of inputs across multiple registered Lenses.
 * Aggregates individual Lens results into a final LogicVerdict.
 */
export class CoreEngine {
    private lenses: ILens[] = [];

    constructor() {
        // Register default lenses
        this.registerLens(new IntegrityLens());
        this.registerLens(new ConvergenceLens());
        this.registerLens(new ResonanceLens());
        this.registerLens(new IdentityLens());
    }

    /**
     * Register a new Lens to the pipeline.
     */
    registerLens(lens: ILens): void {
        this.lenses.push(lens);
    }

    /**
     * Evaluate input through all registered lenses.
     * Returns a unified verdict.
     */
    async evaluate(input: LogicInput): Promise<LogicVerdict> {
        if (this.lenses.length === 0) {
            return this.createEmptyVerdict();
        }

        // execute all lenses in parallel
        const results = await Promise.all(
            this.lenses.map(lens => lens.evaluate(input))
        );

        return this.synthesizeVerdict(results);
    }

    private synthesizeVerdict(results: LensResult[]): LogicVerdict {
        // 1. Calculate Integrated Score (Simple Average for now)
        const totalScore = results.reduce((acc, r) => acc + r.score, 0);
        const integratedScore = totalScore / results.length;

        // 2. Determine Overall Status
        // If ANY lens reports CRITICAL, the verdict is PAUSE.
        // If ANY lens reports FRICTION, the verdict is FLAG.
        // Otherwise FLOW.
        let status: "FLOW" | "FLAG" | "PAUSE" = "FLOW";
        if (results.some(r => r.status === "CRITICAL")) {
            status = "PAUSE";
        } else if (results.some(r => r.status === "FRICTION")) {
            status = "FLAG";
        }

        // 3. Identify Primary Constraint (from the most critical result)
        // Find the worst scoring result
        const worstResult = [...results].sort((a, b) => a.score - b.score)[0];
        const primaryConstraint = worstResult.suggestion;

        // 4. Synthesis String
        const synthesisParts = results
            .filter(r => r.status !== "STABLE")
            .map(r => `[${r.lensName}]: ${r.markers.join(", ")}`);

        const synthesis = synthesisParts.length > 0
            ? synthesisParts.join("; ")
            : "All lenses report stable alignment.";

        return {
            status,
            integratedScore,
            results,
            primaryConstraint,
            synthesis
        };
    }

    private createEmptyVerdict(): LogicVerdict {
        return {
            status: "FLOW",
            integratedScore: 1.0,
            results: [],
            synthesis: "No lenses configured."
        };
    }
}
