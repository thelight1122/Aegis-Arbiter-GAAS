import React from "react";
import type { AegisStatus, ToolSettings } from "../types.js";

type Props = {
  settings: ToolSettings;
  onSettingsChange: (next: ToolSettings) => void;
  onAegisStatus: (status: AegisStatus) => void;
};

export default function ToolsPanel({
  settings,
  onSettingsChange,
  onAegisStatus
}: Props) {
  function setMode(e: React.ChangeEvent<HTMLSelectElement>) {
    const mode = e.currentTarget.value as ToolSettings["mode"];
    onSettingsChange({ ...settings, mode });
    onAegisStatus({ ok: true, message: `Mode set: ${mode}` });
  }

  function toggleAutoCopy(e: React.ChangeEvent<HTMLInputElement>) {
    onSettingsChange({ ...settings, autoCopyJson: e.currentTarget.checked });
  }

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #2b2b2b",
        borderRadius: 12,
        background: "#121212",
        color: "#eaeaea"
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Tools</div>

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: 0.85 }}>Mode</span>
          <select
            aria-label="Aegis mode"
            value={settings.mode}
            onChange={setMode}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0b0b",
              color: "#eaeaea"
            }}
          >
            <option value="rbc">RBC</option>
            <option value="arbiter">Arbiter</option>
            <option value="telemetry">Telemetry</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.autoCopyJson}
            onChange={toggleAutoCopy}
          />
          <span style={{ opacity: 0.85 }}>Auto-copy JSON output</span>
        </label>

        <button
          type="button"
          onClick={() =>
            onAegisStatus({ ok: true, message: "UI ready (demo)." })
          }
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#0b0b0b",
            color: "#eaeaea",
            cursor: "pointer"
          }}
        >
          Ping
        </button>
      </div>
    </div>
  );
}
