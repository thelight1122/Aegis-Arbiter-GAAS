import type { AegisTensor, TensorType } from "../tensor.js";
import type { Database } from "better-sqlite3";

export type LedgerType = "physical" | "emotional" | "mental" | "spiritual";

export interface LedgerEntry {
    session_id: string;
    tensor_id?: string;
    signal_data: string;
    resonance_score: number;
}

export class TensorRepository {
    constructor(private db: Database) { }

    /**
     * Saves a tensor to the database.
     */
    save(sessionId: string, tensor: AegisTensor): void {
        const query = this.db.prepare(
            "INSERT INTO tensors (tensor_id, session_id, tensor_type, data, drift_risk, equilibrium_delta) VALUES (?, ?, ?, ?, ?, ?)"
        );
        query.run(
            tensor.tensor_id,
            sessionId,
            tensor.tensor_type,
            JSON.stringify(tensor.state),
            tensor.state.axes.drift_risk ?? 0.0,
            tensor.state.axes.resonance_index ?? 0.0
        );
    }

    /**
     * Saves a signal to a specific ledger.
     */
    saveToLedger(type: LedgerType, entry: LedgerEntry): void {
        const tableName = `ledger_${type}`;
        const query = this.db.prepare(
            `INSERT INTO ${tableName} (session_id, tensor_id, signal_data, resonance_score) VALUES (?, ?, ?, ?)`
        );
        query.run(entry.session_id, entry.tensor_id, entry.signal_data, entry.resonance_score);
    }

    /**
     * Retrieves the most recent tensors of a specific type.
     */
    async getTensors(sessionId: string, type: TensorType, limit: number): Promise<AegisTensor[]> {
        const query = this.db.prepare(
            "SELECT data FROM tensors WHERE session_id = ? AND tensor_type = ? ORDER BY created_at DESC LIMIT ?"
        );
        const rows = query.all(sessionId, type, limit) as Array<{ data: string }>;
        return rows.map((row) => JSON.parse(row.data) as AegisTensor);
    }

    /**
     * Retrieves the peer profile for a session.
     */
    async getPeerProfile(sessionId: string): Promise<any> {
        const query = this.db.prepare("SELECT * FROM peer_profiles WHERE session_id = ?");
        return query.get(sessionId);
    }

    /**
     * Retrieves the most recent Spine tensors for a session (Legacy wrapper).
     */
    async getSpine(sessionId: string, limit: number): Promise<AegisTensor[]> {
        return this.getTensors(sessionId, "ST", limit);
    }

    /**
     * Retrieves the spine vector for a given session (Legacy placeholder).
     */
    async getSpineVector(sessionId: string): Promise<number[] | null> {
        return null;
    }

    /**
     * Updates or creates a peer profile.
     */
    savePeerProfile(sessionId: string, profile: { baseline_resonance: number, sovereignty_score: number, metadata: string }): void {
        const query = this.db.prepare(
            "INSERT INTO peer_profiles (session_id, baseline_resonance, sovereignty_score, metadata) VALUES (?, ?, ?, ?) " +
            "ON CONFLICT(session_id) DO UPDATE SET baseline_resonance=excluded.baseline_resonance, sovereignty_score=excluded.sovereignty_score, metadata=excluded.metadata, last_active_at=CURRENT_TIMESTAMP"
        );
        query.run(sessionId, profile.baseline_resonance, profile.sovereignty_score, profile.metadata);
    }
}
