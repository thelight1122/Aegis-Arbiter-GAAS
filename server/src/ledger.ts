import { TensorRepository } from "../../ui/kernel/storage/tensorRepository.js";

/**
 * The Ledger endpoint provides access to the Logic Spine.
 * It fulfills AXIOM_5_AWARENESS.
 */
export function ledgerMiddleware(repo: TensorRepository) {
  return async (req: any, res: any) => {
    const { sessionId } = req.query;

    try {
      // Retrieve ST tensors (Stable Spine)
      const spine = await repo.getSpine(sessionId as string, 50);

      res.json({
        ok: true,
        session_id: sessionId,
        count: spine.length,
        tensors: spine
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Ledger Retrieval Fractured" });
    }
  };
}
