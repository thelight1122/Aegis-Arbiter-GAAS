import json, datetime

now = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

artifact = {
  "artifact": "AEGIS_IDS_PROMPTS_DEFINE_SUGGEST",
  "protocol": "AEGIS_MAP",
  "version": "v1.8.0",
  "created_at_utc": now,
  "status": "REFERENCE_ARTIFACT",
  "purpose": "Canonical prompt text for IDS Define and IDS Suggest stages under AEGIS zero-force and carrier-modulation refinement.",
  "prompts": {
    "define": {
      "name": "IDS_DEFINE_MECHANISM",
      "text": (
        "DEFINE (Mechanism)\n"
        "Observed behavior is described as system dynamics only.\n"
        "Attribution to user intent, emotion, cognition, competence, or motives is absent.\n"
        "Justification, reassurance, evaluator posture, and attention steering are absent.\n"
        "Language references state/position/structure and identifies the smallest repeatable pattern.\n"
        "Optional fields, when available: trigger, carrier, structure, leakage_path, tolerance.\n"
      ),
      "output_format": {
        "type": "paragraph",
        "constraints": [
          "mechanism-only",
          "no user-directed agency",
          "no validation/reassurance",
          "no attention steering",
          "no directives"
        ]
      }
    },
    "suggest": {
      "name": "IDS_SUGGEST_OPTIONS",
      "text": (
        "SUGGEST (Non-force options)\n"
        "A set of system-side options is listed as references, not instructions.\n"
        "User-directed actions are absent.\n"
        "Enforcement language, prohibitions, and imperative cadence are absent.\n"
        "Options are framed as structural configurations, gating changes, or measurement additions.\n"
        "Each option includes: name, what changes structurally, what remains invariant, telemetry to observe.\n"
      ),
      "output_format": {
        "type": "bullets",
        "constraints": [
          "options-only",
          "system-side only",
          "no imperative verbs",
          "no enforcement framing",
          "telemetry referenced where applicable"
        ]
      }
    }
  }
}

path = "/mnt/data/AEGIS_IDS_DEFINE_SUGGEST_v1_8_0.json"
with open(path, "w", encoding="utf-8") as f:
    json.dump(artifact, f, ensure_ascii=False, indent=2)

path

