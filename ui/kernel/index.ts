import { TensorFactory } from "./tensor/factory.js";
import type { TensorRepository } from "./storage/tensorRepository.js";
// Assuming the linter is imported from the existing project structure
import { analyzeText } from "../src/analyzeText.js"; 

export class AegisKernel {
  constructor(private repo: TensorRepository) {}

  /**
   * The core interaction loop. 
   * Observe -> Map -> Ground.
   */
  async processTurn(sessionId: string, input: string): Promise<any> {
    // 1. Observe (The Linter)
    const analysis = analyzeText(input); 

    // 2. Map (The TensorFactory)
    const tensor = TensorFactory.createPT(input, analysis.findings, {
      channel: "user",
      thread_id: sessionId 
    });

    // 3. Ground (The Repository)
    this.repo.save(sessionId, tensor);

    // 4. Report (IDS-ready data)
    return {
      tensor_id: tensor.tensor_id,
      drift_risk: tensor.state.axes.drift_risk,
      analysis: analysis
    };
  }
}
