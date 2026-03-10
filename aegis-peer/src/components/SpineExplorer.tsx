import React, { useEffect, useState } from 'react';
import './SpineExplorer.css';
import { apiUrl } from '../lib/apiBase';

interface TensorEntry {
  tensor_id?: string;
  state?: {
    labels?: { axiom_tags?: string[] };
    axes?: { coherence_score?: number };
    payload?: { text?: string };
  };
}

/**
 * The SpineExplorer allows the peer to browse the Logic Spine.
 * Fulfills AXIOM_5_AWARENESS.
 */
export const SpineExplorer: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [history, setHistory] = useState<TensorEntry[]>([]);

  useEffect(() => {
    fetch(apiUrl(`/ledger?sessionId=${sessionId}`))
      .then((res) => res.json())
      .then((data) => setHistory(data.tensors ?? []))
      .catch(() => {
        // silently fail — spine is non-critical display
      });
  }, [sessionId]);

  return (
    <div className="spineExplorerContainer">
      <h4>Logic Spine: ST Repository</h4>
      <div className="spineExplorerHistory">
        {history.map((t, i) => {
          const axioms = t.state?.labels?.axiom_tags?.join(', ') ?? '—';
          const coherence = t.state?.axes?.coherence_score?.toFixed(2) ?? '—';
          const snippet = t.state?.payload?.text?.substring(0, 100);
          return (
            <div key={i} className="spineExplorerEntry">
              <p><strong>ID:</strong> {t.tensor_id ?? '—'}</p>
              <p><strong>AXIOMS:</strong> {axioms}</p>
              <p><strong>COHERENCE:</strong> {coherence}</p>
              {snippet && <p><em>"{snippet}..."</em></p>}
            </div>
          );
        })}
        {history.length === 0 && <p>No stable states recorded in Spine.</p>}
      </div>
    </div>
  );
};
