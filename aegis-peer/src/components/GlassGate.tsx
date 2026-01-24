// /ui/src/components/GlassGate.tsx
import React, { useEffect, useState } from "react";
import "./GlassGate.css";
// /ui/src/components/GlassGate.tsx
import { streamUrl } from "../lib/apiBase";

const es = new EventSource(streamUrl("/api/witness"));

interface Telemetry {
  flow_energy: number;
  lenses: { physical: number; emotional: number; mental: number; spiritual: number };
  tension: number;
  active_axioms: string[];
}

export const GlassGate: React.FC = () => {
  const [data, setData] = useState<Telemetry | null>(null);

  useEffect(() => {
    // Bypass Vite proxy for SSE (more stable on Windows)
    const es = new EventSource("http://localhost:8787/api/witness");

    es.onmessage = (event) => {
      const payload = JSON.parse(event.data) as Telemetry;
      setData(payload);
    };

    return () => es.close();
  }, []);

  if (!data) return <div className="glass-gate-placeholder">Awaiting Resonance...</div>;

  return (
    <div className="glass-gate">
      <div className="glass-gate-metric">Flow: {data.flow_energy}</div>
      <div className="glass-gate-metric">Tension: {data.tension}</div>
    </div>
  );
};
