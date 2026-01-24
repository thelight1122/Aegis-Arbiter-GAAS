import fs from "fs";
import { TelemetryEvent } from "./types";

export function serializeTelemetryEvent(event: TelemetryEvent): string {
  const ordered: TelemetryEvent = {
    ts: event.ts,
    session_id: event.session_id,
    mode: event.mode,
    lens: event.lens,
    tension: event.tension,
    tags: event.tags,
    payload: event.payload,
    source: event.source
  };
  return JSON.stringify(ordered);
}

export class TelemetryEmitter {
  private readonly telemetryPath: string;

  constructor(telemetryPath: string) {
    this.telemetryPath = telemetryPath;
  }

  append(event: TelemetryEvent): void {
    const line = serializeTelemetryEvent(event) + "\n";
    fs.appendFileSync(this.telemetryPath, line);
  }
}
