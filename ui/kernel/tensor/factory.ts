import type { AegisTensor } from "../tensor.js";
import { FindingMap } from "./mappings.js";
import { createHash, randomUUID } from "node:crypto";

export class TensorFactory {
  static createPT(input: string, findings: any[], metadata: any = {}): AegisTensor {
    const now = new Date().toISOString();
    
    // Calculate axis deltas from findings
    let totalRisk = 0;
    let totalCoherence = 0.5; // Baseline
    const axiomTags: string[] = [];

    findings.forEach(f => {
      const map = FindingMap[f.type] || { axiom: "UNCERTAIN", risk: 0.1, coherence: 0 };
      totalRisk += map.risk;
      totalCoherence += map.coherence;
      if (!axiomTags.includes(map.axiom)) axiomTags.push(map.axiom);
    });

    return {
      tensor_id: randomUUID(),
      tensor_type: "PT",
      version: "1.0.0",
      created_at: now,
      source: {
        channel: metadata.channel || "system",
        thread_id: metadata.thread_id,
        turn_id: metadata.turn_id
      },
      state: {
        payload: {
          text: input,
          hash: createHash("sha256").update(input).digest("hex").slice(0, 16)
        },
        axes: {
          temporal_proximity: 1.0,
          context_scope: "moment",
          drift_risk: Math.min(Math.max(totalRisk, 0), 1),
          coherence_score: Math.min(Math.max(totalCoherence, 0), 1),
          salience_weight: findings.length > 0 ? 0.8 : 0.2
        },
        labels: {
          axiom_tags: axiomTags,
          origin_integrity: "observed",
          confidence: 0.95
        }
      },
      lifecycle: {
        ttl_seconds: 3600,
        decay_rate: 0.1,
        pinned: false
      }
    };
  }
}
