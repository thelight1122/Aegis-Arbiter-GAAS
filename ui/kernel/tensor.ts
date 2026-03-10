// src/kernel/types/tensor.ts

export type TensorType = "PT" | "ST" | "PCT" | "NCT" | "SPINE";

export interface AegisTensor {
  tensor_id: string;
  tensor_type: TensorType;
  version: "1.0.0";
  created_at: string; // ISO 8601
  updated_at?: string;
  source: {
    channel: "user" | "assistant" | "system" | "tool" | "external";
    thread_id?: string;
    turn_id?: string;
  };
  state: {
    payload: {
      text?: string;
      summary?: string;
      hash?: string;
    };
    axes: {
      temporal_proximity?: number; // 0..1 (PT focus)
      context_scope: "moment" | "task" | "conversation" | "project";
      salience_weight?: number;    // 0..1 (PT focus)
      drift_risk?: number;         // 0..1 (PT focus)
      coherence_score?: number;    // 0..1 (ST focus)
      resonance_index?: number;    // 0..1 (ST focus)
    };
    labels: {
      axiom_tags: string[];        // e.g., ["AXIOM_3", "AXIOM_11"]
      origin_integrity: "observed" | "derived" | "corrected" | "uncertain";
      confidence: number;          // 0..1
    };
  };
  lifecycle: {
    ttl_seconds: number;
    decay_rate: number;
    pinned: boolean;
  };
}
