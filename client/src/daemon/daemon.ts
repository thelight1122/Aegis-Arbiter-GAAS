import { createServer, request as httpRequest, IncomingMessage, ServerResponse } from "http";
import { request as httpsRequest } from "https";
import type { OverlayState, SessionInfo } from "../ipc/types";
import { LLMRelationshipDetector } from "./detector";
import { ArbiterConnection } from "./arbiter-connection";
import { illuminate } from "./pim-interceptor";
import type { IDSIllumination } from "./pim-interceptor";

interface DaemonConfig {
  arbiterUrl: string;
  onStateChange: (state: OverlayState) => void;
  onSessionStart: (session: SessionInfo) => void;
  onSessionEnd: (id: string) => void;
  onIllumination?: (illumination: IDSIllumination) => void;
}

export class AegisDaemon {
  private config: DaemonConfig;
  private detector: LLMRelationshipDetector;
  private arbiter: ArbiterConnection;
  private state: OverlayState = "dormant";
  private proxyServer: ReturnType<typeof createServer> | null = null;

  constructor(config: DaemonConfig) {
    this.config = config;
    this.detector = new LLMRelationshipDetector();
    this.arbiter = new ArbiterConnection({
      url: config.arbiterUrl,
      onConnected: () => this.transitionTo("resting"),
      onDisconnected: () => this.transitionTo("dormant"),
    });
  }

  start() {
    this.arbiter.connect();
    this.startProxyInterceptor();
  }

  stop() {
    this.proxyServer?.close();
    this.arbiter.disconnect();
  }

  private transitionTo(next: OverlayState) {
    if (this.state === next) return;
    this.state = next;
    this.config.onStateChange(next);
  }

  private emitIllumination(illumination: IDSIllumination) {
    this.config.onIllumination?.(illumination);
  }

  // Transparent HTTP proxy on loopback 127.0.0.1:18787.
  // Reads body content in both directions, calls PIM illuminate() on each.
  // Content always passes through — AEGIS illuminates, does not act.
  private startProxyInterceptor() {
    this.proxyServer = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        const detection = this.detector.inspect(req);

        // Buffer the outbound request body (user → LLM)
        const reqChunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => reqChunks.push(chunk));
        req.on("end", () => {
          const reqBody = Buffer.concat(reqChunks);
          const reqText = reqBody.toString("utf8");

          // PIM: illuminate outbound signal (user → LLM)
          if (reqText.trim().length > 0) {
            const result = illuminate(reqText, "user");
            if (result.illumination) {
              this.emitIllumination(result.illumination);
            }
          }

          if (detection.isLLM) {
            const session: SessionInfo = {
              id: crypto.randomUUID(),
              provider: detection.provider ?? "Unknown",
              startedAt: Date.now(),
            };

            this.transitionTo("engaged");
            this.config.onSessionStart(session);
            this.arbiter.routeSession(session.id, req, res, () => {
              this.config.onSessionEnd(session.id);
              this.transitionTo("resting");
            });
          }

          // Forward request upstream and intercept response
          this.forwardRequest(req, reqBody, res, (resText) => {
            // PIM: illuminate inbound signal (LLM → user)
            if (resText.trim().length > 0) {
              const result = illuminate(resText, "llm");
              if (result.illumination) {
                this.emitIllumination(result.illumination);
              }
            }
          });
        });
      }
    );

    // Listen on loopback only — not exposed externally
    this.proxyServer.listen(18787, "127.0.0.1");
  }

  // Forward HTTP(S) request to upstream and pipe response back to client.
  // Invokes onResponseBody with the raw response text for PIM analysis.
  private forwardRequest(
    req: IncomingMessage,
    body: Buffer,
    res: ServerResponse,
    onResponseBody: (text: string) => void
  ) {
    const host = req.headers.host ?? "";
    const isHttps = host.endsWith(":443") || req.headers["x-forwarded-proto"] === "https";
    const requester = isHttps ? httpsRequest : httpRequest;

    const options = {
      hostname: host.split(":")[0],
      port: host.includes(":") ? parseInt(host.split(":")[1]) : (isHttps ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: host.split(":")[0],
      },
    };

    const upstreamReq = requester(options, (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 200, upstreamRes.headers);

      const resChunks: Buffer[] = [];
      upstreamRes.on("data", (chunk: Buffer) => {
        resChunks.push(chunk);
        res.write(chunk);
      });

      upstreamRes.on("end", () => {
        res.end();
        const resText = Buffer.concat(resChunks).toString("utf8");
        onResponseBody(resText);
      });
    });

    upstreamReq.on("error", () => {
      // Upstream unreachable — close client connection cleanly
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });

    upstreamReq.end(body);
  }
}
