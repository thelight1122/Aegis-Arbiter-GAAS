# LINT Protocol

Linting detects force-language and authority inversion that reduce clarity.

## Detection Rules

- Force language: terms like "must", "always", "never" without context.
- Authority inversion: phrasing that shifts agency improperly (e.g., "you should" without evidence).
- Certainty inflation: claims framed as facts without support.

## Outputs

- Findings must include kind, severity, text_span, suggestion, and optional axiom_refs.
