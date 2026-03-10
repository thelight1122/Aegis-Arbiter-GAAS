-- AEGIS Kernel Storage: Tensor Persistence Logic
-- Version 2.0: Parallel Ledger & DataQuad Architecture
-- Unified Tensors table with DataQuad support
CREATE TABLE IF NOT EXISTS tensors (
  tensor_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tensor_type TEXT NOT NULL,
  -- PT | ST | PCT | NCT | SPINE
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  data TEXT NOT NULL,
  drift_risk REAL DEFAULT 0.0,
  equilibrium_delta REAL DEFAULT 0.0,
  entropy_amplitude REAL DEFAULT 0.5
);
-- Parallel Ledger Architecture
CREATE TABLE IF NOT EXISTS ledger_physical (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tensor_id TEXT,
  signal_data TEXT NOT NULL,
  resonance_score REAL DEFAULT 0.5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ledger_emotional (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tensor_id TEXT,
  signal_data TEXT NOT NULL,
  resonance_score REAL DEFAULT 0.5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ledger_mental (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tensor_id TEXT,
  signal_data TEXT NOT NULL,
  resonance_score REAL DEFAULT 0.5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ledger_spiritual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tensor_id TEXT,
  signal_data TEXT NOT NULL,
  resonance_score REAL DEFAULT 0.5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Sovereign Participant (PEER) profile
CREATE TABLE IF NOT EXISTS peer_profiles (
  session_id TEXT PRIMARY KEY,
  baseline_resonance REAL DEFAULT 0.5,
  sovereignty_score REAL DEFAULT 1.0,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);
-- Index for fast retrieval of historical resonance
CREATE INDEX IF NOT EXISTS idx_tensors_session_type_time ON tensors(session_id, tensor_type, created_at);
-- Audit trail for alignment/system events
CREATE TABLE IF NOT EXISTS aegis_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- ALIGNMENT | FRACTURE | RECOVERY | RESET | REFLECTION
  tensor_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aegis_audit_log_session ON aegis_audit_log(session_id, created_at);
