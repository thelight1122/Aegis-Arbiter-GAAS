import React, { useEffect, useState } from 'react';
import './SpineExplorer.css';
import { apiUrl } from '../lib/apiBase';

/**
 * The SpineExplorer allows the peer to browse the Logic Spine.
 * It fulfills AXIOM_5_AWARENESS.
 */
export const SpineExplorer: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(apiUrl(`/ledger?sessionId=${sessionId}`))
      .then(res => res.json())
      .then(data => setHistory(data.tensors || []));
  }, [sessionId]);

  return (
    <div className="spineExplorerContainer">
      <h4>Logic Spine: ST Repository</h4>
      <div className="spineExplorerHistory">
        {history.map((t, i) => (
          <div key={i} className="spineExplorerEntry">
            <p><strong>ID:</strong> {t.tensor_id}</p>
            <p><strong>AXIOMS:</strong> {t.state.labels.axiom_tags.join(', ')}</p>
            <p><strong>COHERENCE:</strong> {t.state.axes.coherence_score.toFixed(2)}</p>
            <p><em>"{t.state.payload.text?.substring(0, 100)}..."</em></p>
          </div>
        ))}
        {history.length === 0 && <p>No stable states recorded in Spine.</p>}
      </div>
    </div>
  );
};
