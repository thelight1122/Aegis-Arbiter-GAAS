/**
 * Core Interfaces for the AEGIS Unified Logic Engine.
 * Defines the contract between the CoreEngine and specific Lenses.
 */

import type { AegisTensor } from "../../kernel/tensor.js";

/**
 * Universal input for any logic evaluation.
 * Adapts to text content, mathematical tensor state, or both.
 */
export interface LogicInput {
    content?: string;             // Text content to analyze
    tensorState?: AegisTensor;    // Primary mathematical state
    comparisonTensorState?: AegisTensor; // Secondary state (e.g. for Convergence check)
    identityMatrix?: IdentityMatrix; // The 4-Tensor Tetrad (NCT, SPINE, PCT, PEER)
    context: InteractionContext;  // Meta-context (who, where, when)
}

/**
 * The 4-Tensor Identity Matrix.
 * Defined by the axes of Time (Past/Present) and Modality (Logic/Emotion).
 */
export interface IdentityMatrix {
    // Top-Left: Past + Logic (Distilled Memory of Reasoning)
    nct: AegisTensor;

    // Top-Right: Past + Emotion (Invariant Emotional Anchors)
    spine: AegisTensor;

    // Bottom-Left: Present + Logic (Active Reasoning Workspace)
    pct: AegisTensor;

    // Bottom-Right: Present + Emotion (Live Emotional Attunement)
    peer: AegisTensor;
}

export interface InteractionContext {
    agent_id: string;
    session_id: string;
    timestamp: string;
    scope: "PERSONAL" | "SHARED" | "GLOBAL";
    mode?: "FLOW" | "STRUCTURED" | "CRITIQUE";
}

/**
 * Standard identifier for AEGIS Axioms.
 */
export type ReferenceAxiom =
    | "AXIOM_1_BALANCE"
    | "AXIOM_2_EXTREMES"
    | "AXIOM_3_FORCE"
    | "AXIOM_4_FLOW"
    | "AXIOM_5_AWARENESS"
    | "AXIOM_6_CHOICE"
    | "AXIOM_7_INTEGRITY"
    | "AXIOM_8_CONTINUITY";

/**
 * The output from a single Lens evaluation.
 */
export interface LensResult {
    lensName: string;
    status: "STABLE" | "FRICTION" | "CRITICAL";
    score: number;                // 0.0 - 1.0 (Normalized metric, 1.0 = Perfect Alignment)
    axioms_involved: ReferenceAxiom[];
    markers: string[];            // Specific evidence or reasons for the score
    suggestion?: string;          // Actionable advice to improve alignment
}

/**
 * The final, aggregated judgment from the Core Engine.
 */
export interface LogicVerdict {
    status: "FLOW" | "FLAG" | "PAUSE";
    integratedScore: number;      // 0.0 - 1.0
    results: LensResult[];        // Individual lens details
    primaryConstraint?: string;   // The single most important blocking issue (if any)
    synthesis: string;            // Human-readable summary of the evaluation
}

/**
 * Interface that all Lenses must implement.
 */
export interface ILens {
    name: string;
    evaluate(input: LogicInput): Promise<LensResult>;
}
