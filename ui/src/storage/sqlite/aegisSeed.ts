// /src/storage/sqlite/aegisSeed.ts

import crypto from "node:crypto";
import type { DatabaseSync as Database } from "node:sqlite";

type Json = Record<string, unknown>;

function uuid(): string {
  return crypto.randomUUID();
}

export function ensureAegisSeed(
  db: Database,
  params: { orgId: string; orgName: string; userId: string; displayName?: string }
): void {
  const { orgId, orgName, userId, displayName } = params;

  db.prepare(`INSERT OR IGNORE INTO aegis_orgs (id, name) VALUES (?, ?)`).run(
    orgId,
    orgName
  );

  db.prepare(
    `INSERT OR IGNORE INTO aegis_profiles (user_id, org_id, display_name) VALUES (?, ?, ?)`
  ).run(userId, orgId, displayName ?? null);

  // Seed the 7 Roots in the catalog
  const roots: Array<{ id: string; title: string; description: string }> = [
    { id: "root.honesty", title: "Root: Honesty", description: "Integrity sensor: honesty alignment in the interaction." },
    { id: "root.respect", title: "Root: Respect", description: "Integrity sensor: respect alignment in the interaction." },
    { id: "root.attention", title: "Root: Attention", description: "Integrity sensor: attention/clarity alignment in the interaction." },
    { id: "root.affection", title: "Root: Affection", description: "Integrity sensor: goodwill/care expressed in the interaction." },
    { id: "root.loyalty", title: "Root: Loyalty", description: "Integrity sensor: loyalty to stated commitments / avoidance of betrayal requests." },
    { id: "root.trust", title: "Root: Trust", description: "Integrity sensor: trust calibration (no hidden certainty, no blind reliance)." },
    { id: "root.communication", title: "Root: Communication", description: "Integrity sensor: communication clarity and bidirectional understanding." },
  ];

  const ins = db.prepare(
    `INSERT OR IGNORE INTO aegis_marker_catalog (id, category, title, description)
     VALUES (?, 'domain', ?, ?)`
  );
  for (const r of roots) ins.run(r.id, r.title, r.description);

  // Seed org temporal tensor with IMMU-GROUND axioms
  const axioms = [
    { id: "axiom.1", title: "Equilibrium (The Balance)", immu_ground: true },
    { id: "axiom.2", title: "Sovereignty (The Boundary)", immu_ground: true },
    { id: "axiom.3", title: "Non-Force (The Flow)", immu_ground: true },
    { id: "axiom.4", title: "Alignment (The Interface)", immu_ground: true },
    { id: "axiom.5", title: "Integrity (The Core)", immu_ground: true },
    { id: "axiom.6", title: "Time (The Anchor)", immu_ground: true },
    { id: "axiom.7", title: "The Release (The Threshold)", immu_ground: true },
  ];

  const constraints: Json = {
    integrity: {
      thresholds: { pause: 0.999 },
      spacing: { minutes: 30 },
      promotion: { minTotal: 3, minSpaced: 2 },
    },
  };

  db.prepare(
    `INSERT OR IGNORE INTO aegis_temporal_tensors
      (id, scope_type, scope_id, tensor_version, axioms, definitions, constraints)
     VALUES (?, 'org', ?, '1.0.0', ?, '{}', ?)`
  ).run(uuid(), orgId, JSON.stringify(axioms), JSON.stringify(constraints));
}
