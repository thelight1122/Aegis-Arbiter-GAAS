import * as crypto from 'node:crypto';
import type { AegisTensor } from "../tensor.js";

/**
 * The TokenService generates the 'Release Token'.
 * It fulfills the 'Sovereign-Preserving Gating' requirement.
 */
export class TokenService {
  private secret: string;

  constructor() {
    // In a Dev environment, we use a local secret. 
    // In GaaS, this would be an HSM-backed key.
    this.secret = process.env.AEGIS_GATE_SECRET || "arizona_lab_default_secret";
  }

  /**
   * Generates a signed token if resonance is stable.
   * Fulfills AXIOM_4_FLOW.
   */
  generateRelease(tensor: AegisTensor, delta: number): string | null {
    // The gate is LOCKED unless resonance is stable (AXIOM_1_BALANCE)
    if (delta >= 0.4) return null;

    const payload = JSON.stringify({
      tensor_id: tensor.tensor_id,
      timestamp: Date.now(),
      status: "ALIGNED",
      delta: delta
    });

    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(payload);
    const signature = hmac.digest("hex");

    return Buffer.from(JSON.stringify({ payload, signature })).toString("base64");
  }

  /**
   * Verifies the token at the action boundary.
   */
  verify(token: string): boolean {
    try {
      const { payload, signature } = JSON.parse(Buffer.from(token, "base64").toString());
      const hmac = crypto.createHmac("sha256", this.secret);
      hmac.update(payload);
      return hmac.digest("hex") === signature;
    } catch {
      return false;
    }
  }
}
