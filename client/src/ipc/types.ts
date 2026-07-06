export type OverlayState =
  | "dormant"      // No AEGIS Core connection
  | "resting"      // Connected, no active LLM session
  | "engaged"      // LLM relationship detected, IRG environment establishing
  | "flow";        // IRG environment active and stable

export interface SessionInfo {
  id: string;
  provider: string;   // e.g. "Anthropic", "OpenAI" — never the content
  startedAt: number;
}

export interface DaemonStatus {
  connected: boolean;
  arbiterUrl: string;
  activeSession: SessionInfo | null;
  overlayState: OverlayState;
}

export interface IpcChannels {
  // Renderer → Main
  "overlay:drag": { x: number; y: number };
  "overlay:open-sovereignty": void;
  "overlay:minimize": void;

  // Main → Renderer
  "daemon:status": DaemonStatus;
  "daemon:state-change": OverlayState;
  "session:started": SessionInfo;
  "session:ended": { id: string };
}
