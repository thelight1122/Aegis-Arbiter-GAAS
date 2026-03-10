
import type { AegisTensor } from "../tensor.js";
import type { Database } from "better-sqlite3";

/**
 * AuditBridge (an informal term for a 'Peer-to-Spine' data flow) is responsible
 * for logging all significant events that cross the Corpus-Spine boundary.
 *
 * It is a write-only service that provides a clear audit trail of how the
 * system is learning and evolving.
 *
 * @class AuditBridge
 * @param {Database} db - The database connection.
 * @see {BookcaseService}
 */
export class AuditBridge {
    constructor(private db: Database) { }

    /**
     * Logs an alignment event to the audit trail.
     *
     * @param {string} sessionId - The session ID.
     * @param {AegisTensor} tensor - The tensor associated with the event.
     */
    logAlignment(sessionId: string, tensor: AegisTensor): void {
        const query = this.db.prepare(
            "INSERT INTO aegis_audit_log (session_id, event_type, tensor_id, details) VALUES (?, ?, ?, ?)"
        );
        query.run(sessionId, "ALIGNMENT", tensor.tensor_id, JSON.stringify(tensor.state));
    }

    /**
     * Logs a system event to the audit trail.
     *
     * @param {string} sessionId - The session ID.
     * @param {string} eventType - The type of event.
     * @param {Record<string, any>} details - The event details.
     */
    logSystemEvent(sessionId: string, eventType: string, details: Record<string, any>): void {
        const query = this.db.prepare(
            "INSERT INTO aegis_audit_log (session_id, event_type, details) VALUES (?, ?, ?)"
        );
        query.run(sessionId, eventType, JSON.stringify(details));
    }
}
