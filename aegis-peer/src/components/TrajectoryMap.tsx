import React, { useEffect, useState } from 'react';
import './TrajectoryMap.css';
import { apiUrl } from '../lib/apiBase';

/**
 * TrajectoryMap visualizes the path toward AXIOM_1_BALANCE.
 * It fulfills AXIOM_5_AWARENESS.
 */
export const TrajectoryMap: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [trend, setTrend] = useState<any>(null);

  useEffect(() => {
    // Fetches the calculated trend from the SovereigntyProgressService
    fetch(apiUrl(`/progress?sessionId=${sessionId}`))
      .then(res => res.json())
      .then(data => setTrend(data.trend));
  }, [sessionId]);

  if (!trend) return null;

  return (
    <div className="trajectory-map-container">
      <h4>Sovereignty Progress Map</h4>
      <div className="trajectory-map-stats">
        <div>
          <p className="trajectory-map-label">DRIFT VELOCITY</p>
          <p className="trajectory-map-value">{trend.drift_velocity > 0 ? '↑' : '↓'} {Math.abs(trend.drift_velocity).toFixed(2)}</p>
        </div>
        <div>
          <p className="trajectory-map-label">COHERENCE STABILITY</p>
          <p className="trajectory-map-value">{trend.coherence_stability > 0 ? '↑' : '↓'} {Math.abs(trend.coherence_stability).toFixed(2)}</p>
        </div>
      </div>
      <p className="trajectory-map-observation">
        <strong>OBSERVATION:</strong> {trend.observation}
      </p>
    </div>
  );
};
