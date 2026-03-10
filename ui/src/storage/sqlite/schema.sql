-- The tensors table provides durable storage for AEGIS State (PT and ST).
-- Linked to sessions to ensure user-directed purge/export boundaries (AXIOM_11_SOVEREIGNTY).
CREATE TABLE tensors (
  tensor_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tensor_type TEXT NOT NULL, -- PT | ST
  created_at TEXT NOT NULL,
  
  -- Queryable axes for fast ResonanceEngine lookups
  drift_risk REAL NOT NULL DEFAULT 0,
  coherence_score REAL NOT NULL DEFAULT 0,
  salience_weight REAL NOT NULL DEFAULT 0,
  
  -- The full schema-valid object as JSON
  state_json TEXT NOT NULL,
  
  -- Lifecycle management
  ttl_expires_at TEXT, -- Null for ST
  is_pinned INTEGER NOT NULL DEFAULT 0, -- 0 | 1
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Index for fast retrieval of the most recent Logic Spine (ST)
CREATE INDEX idx_tensors_session_type_time
ON tensors(session_id, tensor_type, created_at);

-- Index for identifying high-drift patterns across the environment
CREATE INDEX idx_tensors_drift
ON tensors(drift_risk);
