import React, { useState, useEffect } from "react";
import { witnessEmitter } from "../witness.js";
import "../styles/PeerComponents.css";

interface TelemetryData {
  flow: { resonance: number; entropy: number };
  lens: { physical: number; emotional: number; mental: number; spiritual: number };
  tags: string[];
}

export default function PeerWidget({ onOpenOverlay }: { onOpenOverlay: () => void }) {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    return witnessEmitter.on("resonance_event", (data: unknown) => {
      setTelemetry(data as TelemetryData);
    });
  }, []);

  const resonance = telemetry?.flow.resonance ?? 0.5;
  const glowRadius = isHovered ? 20 : 10;

  return (
    <div
      onClick={onOpenOverlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="peer-widget"
      style={{
        boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 ${glowRadius}px rgba(0, 153, 255, ${resonance})`,
        transform: `scale(${isHovered ? 1.15 : 1})`,
      }}
    >
      <div
        className="peer-widget-inner"
        style={{
          transform: `scale(${1 + resonance * 0.1})`,
          animation: resonance > 0.7 ? "pulse 1s infinite alternate" : "none",
        }}
      >
        <span className="peer-widget-label">A</span>
      </div>
    </div>
  );
}
