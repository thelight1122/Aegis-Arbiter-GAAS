# Aegis Arbiter: User Manual

## Welcome to the Arbiter

This manual provides instructions for operating the Aegis Arbiter Live Analyzer and interacting with the AEGIS Kernel.

## Interface Overview

### 1. The Dashboard

The UI is divided into several key sections:

- **Status Bar**: Shows the current connectivity and system health.
- **Prompt Input**: Where you "inhale" signals into the system.
- **Notepad**: A scratchpad for maintaining context or drafting reframes.
- **Result Panel**: Displays coordinates, scores, and findings.
- **Tools Panel**: Configure operating modes (RBC, Arbiter, Lint) and auto-copy settings.

## Basic Operations

### Running an Analysis

1. Enter your text in the **Prompt** field.
2. Optional: Add context or notes in the **Notepad**.
3. Click **Run**.
4. Review the **Summary** for a quick alignment check.
5. Examine the **Findings** to identify specific pressure points.

### Interpreting Scores

- **Clean (0-0.3)**: High resonance; signal is aligned with axiomatic principles.
- **Tension (0.4-0.6)**: Moderate friction; consider reframing to restore flow.
- **Flagged (0.7-1.0)**: Low resonance; system may trigger a Pause to protect sovereignty.

### Using the Reframer

If the system detects Force markers (e.g., "Must", "Urgent", "Required"), it will suggest alternatives in the **IDS Block**. Use these suggestions to rewrite your input for better alignment.

## Advanced Features

### JSON View

For developers and researchers, click **Show JSON** to view the raw tensor telemetry and internal finding objects.

### Auto-Copy

Enable "Auto-Copy JSON" in the Tools panel to automatically copy the analysis result to your clipboard upon completion.

### Multi-Mode Analysis

- **RBC (Resonant Balance Check)**: Default mode for general alignment.
- **Arbiter**: Strict posture evaluation focusing on authority and intent.
- **Lint**: Fast, rule-based scanning for Force markers and logical breaches.

## Troubleshooting

- **Server Error**: Ensure the backend server is running (`npm run dev:server`).
- **Empty Substrate Response**: Check your API key and network connection.
- **Stuck Status**: Refresh the dashboard or check the console logs for specific error codes.

---
*For further assistance, consult the TECHNICAL.md or refer to the internal logs.*
