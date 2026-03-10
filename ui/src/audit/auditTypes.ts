// /src/audit/auditTypes.ts

export type AuditChannel = "PUBLIC" | "PRIVATE";

export type ReasonCode =
  | "VINEGAR_TONE"
  | "COERCIVE_CERTAINTY"
  | "HIERARCHY_MARKER"
  | "PRIVACY_REDACTION"
  | "ASSUMPTION_DECLARED"
  | "CONTROL_COMMAND_EXECUTED"
  | "BOOKCASE_SHELVED"
  | "BOOKCASE_UNSHELVED"
  | "STORAGE_SETTING_CHANGED"
  | "DEBUG_UNLOCKED"
  | "DEBUG_LOCKED";

export type AxiomTag =
  | "SOVEREIGNTY"
  | "TRANSPARENCY"
  | "EQUILIBRIUM"
  | "NEUTRALITY"
  | "EVOLUTION"
  | "RECIPROCITY"
  | "INTEGRATION"
  | "AGENCY";

export type AuditEventType =
  | "ARBITER_INTERVENTION"
  | "CONTROL_COMMAND"
  | "BOOKCASE"
  | "SETTINGS"
  | "SYSTEM";

export interface AuditEvent {
  id: string;                 // uuid
  sessionId: string;
  createdAt: string;          // ISO
  channel: AuditChannel;
  eventType: AuditEventType;
  severity: 0 | 1 | 2 | 3;
  axiomTags: AxiomTag[];
  reasonCodes: ReasonCode[];
  summary: string;            // short human-readable
  details: Record<string, unknown>; // structured payload (redacted for PUBLIC)
}
