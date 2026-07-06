import React, { useState, useEffect, useRef } from "react";

export type DataPolicy = "none" | "local" | "cloud";

interface Settings {
  dataPolicy: DataPolicy;
  launchAtLogin: boolean;
  arbiterUrl: string;
}

interface Props {
  onClose: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  dataPolicy: "none",
  launchAtLogin: false,
  arbiterUrl: "ws://20.127.92.245:8787",
};

const DATA_POLICY_OPTIONS: {
  value: DataPolicy;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "No saving",
    description:
      "Nothing persists. When your session ends, everything clears. Zero footprint.",
  },
  {
    value: "local",
    label: "Local only",
    description:
      "Saved on this device only. Never leaves your machine. You hold the keys.",
  },
  {
    value: "cloud",
    label: "Cloud",
    description:
      "Saved to AEGIS Core. Enables continuity across your devices. Your explicit choice.",
  },
];

export function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = (window as any).aegis?.getSettings?.();
    if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const save = () => {
    (window as any).aegis?.saveSettings?.(settings);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  const clearData = () => {
    (window as any).aegis?.clearData?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        zIndex: 100,
      }}
    >
      <div
        ref={panelRef}
        style={{
          width: 380,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#080e1a",
          border: "1px solid #1e3a5c",
          borderRadius: 16,
          padding: "28px 28px 24px",
          boxShadow: "0 0 40px rgba(74,122,191,0.18), 0 8px 32px rgba(0,0,0,0.6)",
          color: "#a0c8f0",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#c8dff8", letterSpacing: 1, fontFamily: "Georgia, serif" }}>
              AEGIS
            </div>
            <div style={{ fontSize: 10, color: "#2a5a8a", letterSpacing: 2, marginTop: 2 }}>
              SETTINGS
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #1e3a5c",
              borderRadius: 6,
              color: "#3a6a9a",
              cursor: "pointer",
              fontSize: 13,
              padding: "4px 10px",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Your Data ── */}
        <Section label="YOUR DATA">
          <div style={{ fontSize: 11, color: "#3a6a9a", marginBottom: 8, lineHeight: 1.6 }}>
            This is your data. AEGIS manages it exactly how you choose.
          </div>
          <div style={{
            fontSize: 10,
            color: "#1e4a6a",
            marginBottom: 16,
            lineHeight: 1.6,
            padding: "8px 12px",
            borderLeft: "2px solid #1e3a5c",
            background: "#060c16",
            borderRadius: "0 6px 6px 0",
          }}>
            AEGIS does not sell, share, broker, or monetize your data.
            Not now. Not ever. We are not a data broker.
          </div>
          {DATA_POLICY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 12,
                cursor: "pointer",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${settings.dataPolicy === opt.value ? "#2a5aaa" : "#111e30"}`,
                background: settings.dataPolicy === opt.value ? "#0c1a2e" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${settings.dataPolicy === opt.value ? "#4d96ff" : "#1e3a5c"}`,
                  background: settings.dataPolicy === opt.value ? "#4d96ff" : "transparent",
                  flexShrink: 0,
                  marginTop: 2,
                  transition: "all 0.2s",
                }}
              />
              <div>
                <div style={{ fontSize: 13, color: settings.dataPolicy === opt.value ? "#a0c8f0" : "#4a7aaa", fontWeight: "bold", marginBottom: 3 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 10, color: "#2a5a7a", lineHeight: 1.5 }}>
                  {opt.description}
                </div>
              </div>
              <input
                type="radio"
                name="dataPolicy"
                value={opt.value}
                checked={settings.dataPolicy === opt.value}
                onChange={() => setSettings((s) => ({ ...s, dataPolicy: opt.value }))}
                style={{ display: "none" }}
              />
            </label>
          ))}

          <button
            onClick={clearData}
            style={{
              marginTop: 4,
              background: "none",
              border: "1px solid #1e2a3a",
              borderRadius: 8,
              color: "#2a5a7a",
              cursor: "pointer",
              fontSize: 10,
              padding: "6px 12px",
              width: "100%",
              textAlign: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c0392b")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e2a3a")}
          >
            Clear all saved data now
          </button>
        </Section>

        {/* ── Connection ── */}
        <Section label="CONNECTION">
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#2a5a8a", marginBottom: 6 }}>AEGIS Core URL</div>
            <input
              value={settings.arbiterUrl}
              onChange={(e) => setSettings((s) => ({ ...s, arbiterUrl: e.target.value }))}
              style={{
                width: "100%",
                background: "#0c1a2e",
                border: "1px solid #1e3a5c",
                borderRadius: 8,
                color: "#6ab0d8",
                fontSize: 11,
                padding: "8px 10px",
                outline: "none",
                fontFamily: "monospace",
                boxSizing: "border-box",
              }}
            />
          </div>
        </Section>

        {/* ── Startup ── */}
        <Section label="STARTUP">
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div
              onClick={() => setSettings((s) => ({ ...s, launchAtLogin: !s.launchAtLogin }))}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: settings.launchAtLogin ? "#1e4a8a" : "#0c1a2e",
                border: `1px solid ${settings.launchAtLogin ? "#2a5aaa" : "#1e3a5c"}`,
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute",
                top: 2,
                left: settings.launchAtLogin ? 18 : 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: settings.launchAtLogin ? "#4d96ff" : "#1e3a5c",
                transition: "all 0.2s",
              }}/>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6a9ac8" }}>Launch at login</div>
              <div style={{ fontSize: 10, color: "#2a4a6a", marginTop: 2 }}>AEGIS starts silently when you log in</div>
            </div>
          </label>
        </Section>

        {/* Save button */}
        <button
          onClick={save}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "11px 0",
            background: saved ? "#0c2a4a" : "#0d1f36",
            border: `1px solid ${saved ? "#2a5aaa" : "#1e3a5c"}`,
            borderRadius: 10,
            color: saved ? "#4d96ff" : "#4a7aaa",
            fontSize: 12,
            fontWeight: "bold",
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.3s",
          }}
        >
          {saved ? "SAVED" : "SAVE SETTINGS"}
        </button>

        {/* Footer */}
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 9, color: "#1a3050", letterSpacing: 1 }}>
          SOVEREIGNTY · INTEGRITY · ILLUMINATION · FLOW
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 9,
        color: "#1e4a6a",
        letterSpacing: 2,
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: "1px solid #0e1e2e",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
