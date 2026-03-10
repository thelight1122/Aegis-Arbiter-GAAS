export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface TelemetryEvent {
  ts: string;
  session_id: string;
  mode: string;
  lens: Record<string, string>;
  tension: string;
  tags: string[];
  payload: JsonValue;
  source: string;
}
