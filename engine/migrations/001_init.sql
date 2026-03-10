CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  applied_ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_tensor (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  scope TEXT NOT NULL,
  tags TEXT NOT NULL,
  content TEXT NOT NULL,
  resonance TEXT NOT NULL,
  source TEXT NOT NULL,
  hash_prev TEXT NOT NULL,
  hash_self TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_ts TEXT NOT NULL
);
