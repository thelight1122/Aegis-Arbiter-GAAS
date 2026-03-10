// /aegis-peer/src/components/GlassGate.tsx
import React, { useEffect, useState } from "react";
import "./GlassGate.css";
import { streamUrl } from "../lib/apiBase";

interface Telemetry {
  flow_energy: number;
  lenses: { physical: number; emotional: number; mental: number; spiritual: number };
  tension: number;
  active_axioms: string[];
}

export const GlassGate: React.FC = () => {
  const [data, setData] = useState<Telemetry | null>(null);

  useEffect(() => {
    const es = new EventSource(streamUrl("/api/witness"));

    es.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data) as Telemetry);
      } catch {
        // malformed SSE frame — ignore
      }
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
