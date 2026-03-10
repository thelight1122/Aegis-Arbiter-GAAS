// FILE: src/witness.ts
// Minimal event emitter for witness telemetry (Node + browser safe).

type WitnessHandler = (payload: unknown) => void;

class WitnessEmitter {
  private listeners = new Map<string, Set<WitnessHandler>>();

  on(event: string, handler: WitnessHandler): () => void {
    const set = this.listeners.get(event) ?? new Set<WitnessHandler>();
    set.add(handler);
    this.listeners.set(event, set);
    return () => this.off(event, handler);
  }

  off(event: string, handler: WitnessHandler): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) handler(payload);
  }
}

export const witnessEmitter = new WitnessEmitter();
