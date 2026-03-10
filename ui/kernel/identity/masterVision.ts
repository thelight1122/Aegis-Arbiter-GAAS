import { TensorRepository } from "../storage/tensorRepository.js";
import type { AegisTensor } from "../tensor.js";

declare module "../storage/tensorRepository.js" {
  interface TensorRepository {
    setPinnedST(tensorId: string, pinned: boolean): Promise<void>;
    getPinnedST(sessionId: string): Promise<AegisTensor | null>;
  }
}

/**
 * The MasterVisionService defines the 'Why' of the system.
 * It fulfills the requirement for an 'Identity Signature'.
 */
export class MasterVisionService {
  constructor(private repo: TensorRepository) {}

  /**
   * Pins a specific ST tensor as the 'Master Vision' for a session.
   * Fulfills AXIOM_6_CHOICE.
   */
  async pinVision(sessionId: string, tensorId: string): Promise<void> {
    // Logic for pinning: setting 'is_pinned' to 1 in the DB.
    // This ensures the Spiritual Lens remains stable across decay cycles.
    await this.repo.setPinnedST(tensorId, true);
  }

  /**
   * Retrieves the current 'Identity Signature' (Master Vision).
   * Fulfills AXIOM_5_AWARENESS.
   */
  async getSignature(sessionId: string): Promise<AegisTensor | null> {
    // Finds the most recent pinned ST for the session.
    return this.repo.getPinnedST(sessionId);
  }
}
