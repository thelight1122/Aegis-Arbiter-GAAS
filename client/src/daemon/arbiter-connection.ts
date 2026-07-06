import WebSocket from "ws";
import type { IncomingMessage, ServerResponse } from "http";
import type { SessionInfo } from "../ipc/types";

interface ArbiterConfig {
  url: string;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class ArbiterConnection {
  private config: ArbiterConfig;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSessions = new Map<string, () => void>();

  constructor(config: ArbiterConfig) {
    this.config = config;
  }

  connect() {
    this.ws = new WebSocket(this.config.url, {
      rejectUnauthorized: process.env.NODE_ENV !== "development",
    });

    this.ws.on("open", () => {
      this.clearReconnect();
      this.config.onConnected();
    });

    this.ws.on("close", () => {
      this.config.onDisconnected();
      this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      // Connection errors surface via close event — no additional handling needed
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data.toString());
    });
  }

  disconnect() {
    this.clearReconnect();
    this.ws?.close();
    this.ws = null;
  }

  routeSession(
    sessionId: string,
    _req: IncomingMessage,
    _res: ServerResponse,
    onEnd: () => void
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Arbiter not connected — environment not active, pass through
      onEnd();
      return;
    }

    // Register session end callback
    this.activeSessions.set(sessionId, onEnd);

    // Notify arbiter of new session — structural metadata only, no content
    this.ws.send(
      JSON.stringify({
        type: "session:start",
        sessionId,
        timestamp: Date.now(),
      })
    );
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === "session:end" && msg.sessionId) {
        const onEnd = this.activeSessions.get(msg.sessionId);
        if (onEnd) {
          onEnd();
          this.activeSessions.delete(msg.sessionId);
        }
      }
    } catch {
      // Malformed message — ignore
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
