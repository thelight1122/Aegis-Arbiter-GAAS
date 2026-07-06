import React, { useEffect, useState } from "react";

export interface IDSIllumination {
  source: "user" | "llm";
  sequence: "IDR" | "IDQRA";
  identify: string;
  define: string;
  reflect: string;
  question?: string;
  acknowledge?: string;
  suggest: string[];
}

interface Props {
  illumination: IDSIllumination;
  onDismiss: () => void;
}

// Auto-dismiss after 12 seconds unless hovered
const AUTO_DISMISS_MS = 12000;

export function IlluminationPanel({ illumination, onDismiss }: Props) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (hovered) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [hovered, onDismiss]);

  const isUser = illumination.source === "user";
  const isIDR = illumination.sequence === "IDR";

  const accentColor = isUser ? "#a0c8f0" : "#c4a8f0";
  const sourceLabel = isUser ? "USER SIGNAL" : "LLM SIGNAL";
  const borderColor = isIDR ? "#4a3a6a" : "#1e3a5c";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: 130,
        right: 10,
        width: 320,
        background: "#06090f",
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: "16px 18px 14px",
        boxShadow: `0 0 24px rgba(74,58,106,0.25), 0 4px 20px rgba(0,0,0,0.7)`,
        color: "#7a9ac0",
        fontFamily: "sans-serif",
        fontSize: 11,
        lineHeight: 1.6,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        zIndex: 200,
        cursor: "default",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 1.5,
            color: accentColor,
            opacity: 0.7,
          }}>
            {sourceLabel}
          </div>
          <div style={{
            fontSize: 8,
            letterSpacing: 1,
            color: isIDR ? "#9a6ab0" : "#3a6a8a",
            background: isIDR ? "rgba(90,40,120,0.15)" : "rgba(20,50,80,0.2)",
            padding: "2px 6px",
            borderRadius: 4,
          }}>
            {illumination.sequence}
          </div>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
          style={{
            background: "none",
            border: "none",
            color: "#2a4a6a",
            cursor: "pointer",
            fontSize: 12,
            padding: "0 2px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* IDS body */}
      <div style={{ marginBottom: 8 }}>
        <Label>IDENTIFY</Label>
        <div style={{ color: "#8ab0d0", marginBottom: 8 }}>{illumination.identify}</div>

        <Label>DEFINE</Label>
        <div style={{ color: "#6a90b0", marginBottom: 8 }}>{illumination.define}</div>

        <Label>REFLECT</Label>
        <div style={{ color: "#8ab0d0", marginBottom: illumination.question ? 8 : 0 }}>
          {illumination.reflect}
        </div>

        {illumination.question && (
          <>
            <Label>QUESTION</Label>
            <div style={{ color: "#9a8abf", marginBottom: 8, fontStyle: "italic" }}>
              {illumination.question}
            </div>
          </>
        )}

        {illumination.acknowledge && (
          <>
            <Label>ACKNOWLEDGE</Label>
            <div style={{ color: "#6a90b0", marginBottom: 8 }}>{illumination.acknowledge}</div>
          </>
        )}
      </div>

      {/* Suggestions */}
      {illumination.suggest.length > 0 && (
        <div style={{
          borderTop: "1px solid #0e1e2e",
          paddingTop: 8,
          marginTop: 4,
        }}>
          <Label>SUGGEST</Label>
          {illumination.suggest.map((s, i) => (
            <div key={i} style={{ color: "#4a7a9a", marginBottom: 4, paddingLeft: 8 }}>
              · {s}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 10,
        fontSize: 8,
        color: "#162030",
        textAlign: "center",
        letterSpacing: 1,
      }}>
        ILLUMINATION · NOT JUDGMENT
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 8,
      letterSpacing: 1.5,
      color: "#1e3a50",
      marginBottom: 3,
    }}>
      {children}
    </div>
  );
}
