-- /src/storage/sqlite/aegisSchema.sql
-- AEGIS SQLite Schema v1 (Local)
-- Three-layer temporal stack:
--   Org Temporal Tensor (ground)
--   User Temporal Tensor (overlay)
--   Session Peer Tensor (ephemeral/workbench)
-- Marker lifecycle:
--   Catalog -> Candidates -> Learned + Events (audit)

PRAGMA foreign_keys = ON;

-- ----------------------------
-- Orgs & Profiles (local)
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aegis_profiles (
  user_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES aegis_orgs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aegis_profiles_org_id ON aegis_profiles(org_id);

-- ----------------------------
-- Sessions
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'closed')),

  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,

  integrity_resonance REAL NOT NULL DEFAULT 1.0,

  peer_state TEXT NOT NULL DEFAULT '{}',

  FOREIGN KEY (org_id) REFERENCES aegis_orgs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES aegis_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aegis_sessions_org_user ON aegis_sessions(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_aegis_sessions_status ON aegis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_aegis_sessions_integrity_resonance ON aegis_sessions(integrity_resonance);

-- ----------------------------
-- Temporal Tensors (Org/User)
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_temporal_tensors (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org', 'user')),
  scope_id TEXT NOT NULL,
  tensor_version TEXT NOT NULL DEFAULT '1.0.0',
  axioms TEXT NOT NULL DEFAULT '[]',
  definitions TEXT NOT NULL DEFAULT '{}',
  constraints TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_aegis_temporal_scope ON aegis_temporal_tensors(scope_type, scope_id);

-- ----------------------------
-- Marker Catalog
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_marker_catalog (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('language','posture','workflow','definitions','domain')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------
-- Candidate Markers
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_marker_candidates (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org','user')),
  scope_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  total_count INTEGER NOT NULL DEFAULT 0,
  spaced_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_session_id TEXT,
  evidence_refs TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope_type, scope_id, marker_id),
  FOREIGN KEY (marker_id) REFERENCES aegis_marker_catalog(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_aegis_candidates_scope ON aegis_marker_candidates(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_aegis_candidates_marker ON aegis_marker_candidates(marker_id);

-- ----------------------------
-- Learned Markers
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_learned_markers (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org','user')),
  scope_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0,1)),
  total_count INTEGER NOT NULL DEFAULT 0,
  spaced_count INTEGER NOT NULL DEFAULT 0,
  first_learned_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_session_id TEXT,
  evidence_refs TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope_type, scope_id, marker_id),
  FOREIGN KEY (marker_id) REFERENCES aegis_marker_catalog(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_aegis_learned_scope ON aegis_learned_markers(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_aegis_learned_marker ON aegis_learned_markers(marker_id);

-- ----------------------------
-- Marker Events (append-only audit)
-- ----------------------------
CREATE TABLE IF NOT EXISTS aegis_marker_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('observe','promote','archive','lock','unlock','decay')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('org','user')),
  scope_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES aegis_orgs(id) ON DELETE CASCADE,
  FOREIGN KEY (marker_id) REFERENCES aegis_marker_catalog(id) ON DELETE RESTRICT
);
