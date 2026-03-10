import React, { useEffect, useState } from 'react';
import './GlassGate.css';

interface Telemetry {
  flow_energy: number;
  lenses: {
    physical: number;
    emotional: number;
    mental: number;
    spiritual: number;
  };
  tension: number;
  active_axioms: string[];
}

/**
 * The GlassGate component acts as a passive observer.
 * It fulfills AXIOM_5_AWARENESS.
 */
export const GlassGate: React.FC = () => {
  const [data, setData] = useState<Telemetry | null>(null);

  useEffect(() => {
    // Establish the Witness connection to the Kernel
    const eventSource = new EventSource('/api/witness');

    eventSource.onmessage = (event) => {
      const telemetry = JSON.parse(event.data);
      setData(telemetry);
    };

    return () => eventSource.close(); // Honor AXIOM_6_CHOICE (Disconnect)
  }, []);

  if (!data) return <div>Awaiting Resonance...</div>;

  return (
    <div className="glass-gate">
      <h3>Witness Stream: Glass Gate Active</h3>
      
      <div className="meters">
        <Meter label="Mental (Logic)" value={data.lenses.mental} />
        <Meter label="Emotional (Resonance)" value={data.lenses.emotional} />
        <Meter label="Physical (Resources)" value={data.lenses.physical} />
        <Meter label="Spiritual (Identity)" value={data.lenses.spiritual} />
      </div>

      <div className="status">
        <p><strong>ECU Tension:</strong> {(data.tension * 100).toFixed(0)}%</p>
        <p><strong>Active Axioms:</strong> {data.active_axioms.join(' · ') || 'None'}</p>
        <p><strong>Flow Energy:</strong> {data.flow_energy.toFixed(2)}</p>
      </div>
    </div>
  );
};

const Meter = ({ label, value }: { label: string; value: number }) => {
  const isWarning = value < 0.4;
  return (
    <div className="meter">
      <label>{label}: </label>
      <meter
        min={0}
        max={1}
        value={value}
        className={`meter-bar${isWarning ? ' meter-bar--warning' : ''}`}
      />
    </div>
  );
};
