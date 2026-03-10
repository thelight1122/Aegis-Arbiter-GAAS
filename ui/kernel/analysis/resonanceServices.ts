import type { AegisTensor } from "../tensor.js";
import type { TensorRepository } from "../storage/tensorRepository.js";
import { getVectorDb } from "../storage/vectorDb.js";

// Define the structure of the snapshot
export interface AlignmentSnapshot {
    resonance_status: "aligned" | "misaligned" | "critical";
    equilibrium_delta: number;
    suggested_axiom_tags: string[];
    drivers: {
        drift_risk: number;
        spine_coherence: number;
        current_coherence: number;
    };
    baseline_used: boolean;
}

/**
 * ResonanceService is responsible for analyzing the 'distance' between a new
 * peer tensor and the existing spine.
 *
 * This is a critical part of the system's ability to 'feel' the conversation
 * and detect when the user is pushing against the established frame.
 *
 * @class ResonanceService
 */
export class ResonanceService {
    constructor(private repo: TensorRepository) { }

    /**
     * Calculates the alignment delta between the new tensor and the existing spine.
     *
     * @param {string} sessionId - The session ID.
     * @param {AegisTensor} ptTensor - The new peer tensor.
     * @returns {Promise<number>} - The alignment delta.
     */
    async getAlignmentDelta(sessionId: string, ptTensor: AegisTensor): Promise<number> {
        const vectorDb = await getVectorDb();
        const spineVector = await this.repo.getSpineVector(sessionId);
        if (!spineVector) {
            return 0;
        }

        const text = ptTensor.state.payload.text ?? ptTensor.state.payload.summary;
        if (!text) {
            return 0;
        }

        const peerVector = await vectorDb.createVector(text);
        return await vectorDb.compareVectors(spineVector, peerVector);
    }

    /**
     * Provides a snapshot of the current alignment state.
     *
     * @param {string} sessionId - The session ID.
     * @param {AegisTensor} ptTensor - The new peer tensor.
     * @returns {AlignmentSnapshot} - The alignment snapshot.
     */
    getAlignmentSnapshot(sessionId: string, ptTensor: AegisTensor): AlignmentSnapshot {
        // This is a placeholder implementation.
        // In a real implementation, this would involve a more complex calculation
        // based on the history of the conversation.
        const text = (ptTensor.state.payload.text ?? ptTensor.state.payload.summary ?? "").trim();
        const delta = text ? this.hashToUnit(text) : 0;
        const drivers = {
            drift_risk: delta,
            spine_coherence: Math.max(0, 1 - delta),
            current_coherence: Math.max(0, 1 - delta / 2),
        };

        return {
            resonance_status: delta > 0.7 ? "critical" : delta > 0.3 ? "misaligned" : "aligned",
            equilibrium_delta: delta,
            suggested_axiom_tags: delta > 0.7 ? ["AXIOM_1_BALANCE"] : [],
            drivers,
            baseline_used: false,
        };
    }

    private hashToUnit(input: string): number {
        let hash = 5381;
        for (let i = 0; i < input.length; i += 1) {
            hash = (hash * 33) ^ input.charCodeAt(i);
        }
        const normalized = Math.abs(hash >>> 0) / 0xffffffff;
        return Number.isFinite(normalized) ? normalized : 0;
    }
}
