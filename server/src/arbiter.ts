import { TensorRepository } from "../../ui/kernel/storage/tensorRepository.js";
import { ConvergenceEngine } from "../../ui/src/modules/arbiter/convergenceEngine.js";

/**
 * The Arbiter Controller coordinates two sovereign systems.
 * It fulfills AXIOM_1_BALANCE.
 */
export function arbiterMiddleware(repo: TensorRepository) {
  return async (req: any, res: any) => {
    const { sessionA, sessionB } = req.body;

    try {
      // 1. Rehydrate both Spines (AXIOM_5_AWARENESS)
      const spineA = await repo.getSpine(sessionA, 1);
      const spineB = await repo.getSpine(sessionB, 1);

      if (spineA.length === 0 || spineB.length === 0) {
        return res.status(400).json({ ok: false, error: "Insufficient session data for arbitration." });
      }

      // 2. Calculate Convergence (Relational Equilibrium)
      const convergence = ConvergenceEngine.evaluate(spineA[0], spineB[0]);

      res.json({
        ok: true,
        convergence,
        equilibrium_target: convergence.equilibrium_point
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: "Relational Analysis Fractured" });
    }
  };
}
