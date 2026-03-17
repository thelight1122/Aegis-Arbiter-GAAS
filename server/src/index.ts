// FILE: server/src/index.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runAegisCli } from "./cliRunner.js";
import { ledgerMiddleware } from "./ledger.js";

import { ArbiterOrchestrator } from "../../ui/kernel/orchestrator.js";
import { TensorRepository } from "../../ui/kernel/storage/tensorRepository.js";
import { ResonanceService } from "../../ui/kernel/analysis/resonanceServices.js";
import { MirrorManager } from "../../ui/src/modules/mirror/mirrorManager.js";
import { SovereigntyProgressService } from "../../ui/src/modules/mirror/progressService.js";
import { AuditBridge } from "../../ui/kernel/storage/auditBridge.js";
import { witnessEmitter } from "../../ui/src/witness.js";

import { LLMProviderFactory } from "./llm/providers/LLMProviderFactory.js";
import { createLlmRouter } from "./routes/llm.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (current !== path.dirname(current)) {
    // Check for repo markers (ui/server) BUT ensure we aren't inside a 'dist' folder
    if (fs.existsSync(path.join(current, "ui")) &&
        fs.existsSync(path.join(current, "server")) &&
        !current.toLowerCase().endsWith("dist")) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir; // fallback
}

const repoRoot = findRepoRoot(__dirname);

const dbPath = path.join(repoRoot, "data", "aegis-kernel.sqlite");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Schema always resolves from repo root
const schemaPath = path.resolve(repoRoot, "ui", "kernel", "storage", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);
db.exec("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY);");

const tensorRepo      = new TensorRepository(db);
const resonance       = new ResonanceService(tensorRepo);
const orchestrator    = new ArbiterOrchestrator(tensorRepo, resonance, db);
const mirrorManager   = new MirrorManager(orchestrator);
const progressService = new SovereigntyProgressService(tensorRepo);
const auditBridge     = new AuditBridge(db);

// ---------------------------------------------------------------------------
// Security: CORS — locked to known UI origins.
// Set AEGIS_CORS_ORIGINS=http://localhost:5173,http://localhost:5174 to extend.
// ---------------------------------------------------------------------------
const DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];
const allowedOrigins  = process.env["AEGIS_CORS_ORIGINS"]
  ? process.env["AEGIS_CORS_ORIGINS"].split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no origin header) and known UI origins.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin not allowed: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));

// ---------------------------------------------------------------------------
// LLM Provider (singleton — created ONCE at startup)
// If AEGIS_LLM_PROVIDER is not set, LLM routes return 503 but the rest of the
// server remains fully operational.
// ---------------------------------------------------------------------------
let llmProvider: ReturnType<typeof LLMProviderFactory.create> | null = null;
try {
  llmProvider = LLMProviderFactory.create();
  console.log(`[aegis-arbiter-server] LLM provider: ${llmProvider.displayName}`);
} catch (err) {
  console.warn(
    "[aegis-arbiter-server] LLM provider not configured:",
    err instanceof Error ? err.message : err,
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Root route (useful when reverse-proxied by nginx as /api -> /)
 * This prevents "Cannot GET /" confusion for testers/researchers.
 */
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "aegis-arbiter-server",
    status: "online",
    routes: {
      ping:    "/api/ping",
      analyze: "/api/analyze",
      llm:     "/api/llm/*",
    },
    note:
      "This server is typically reverse-proxied. In Docker, the UI proxies /api/* to this service.",
    timestamp: new Date().toISOString()
  });
});

/**
 * Simple health endpoint (common convention)
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ping", (_req, res) => {
  res.json({
    ok: true,
    status: "ready",
    detail: "In-process analyzer active (no external CLI required).",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ledger", ledgerMiddleware(tensorRepo));

app.get("/api/progress", async (req, res) => {
  const sessionId = (req.query?.["sessionId"] ?? "").toString();
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: "Missing sessionId." });
  }

  try {
    const trend = await progressService.getEvolutionTrend(sessionId);
    res.json({ ok: true, session_id: sessionId, trend });
  } catch {
    res.status(500).json({ ok: false, error: "Progress Retrieval Fractured" });
  }
});

app.post("/api/mirror/reflect", async (req, res) => {
  const sessionId = (req.body?.["sessionId"] ?? "").toString();
  const text = (req.body?.["text"] ?? "").toString();

  if (!sessionId || !text) {
    return res.status(400).json({ ok: false, error: "Missing sessionId or text." });
  }

  try {
    const result = await mirrorManager.reflect(sessionId, text);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Mirror reflection failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ ok: false, error: "Mirror Reflection Fractured", detail: message });
  }
});

app.post(
  "/api/mirror/reflect-media",
  express.raw({
    type: [
      "audio/webm",
      "video/webm",
      "audio/wav",
      "audio/mpeg",
      "video/mp4",
      "application/octet-stream"
    ],
    limit: "50mb"
  }),
  async (req, res) => {
    const sessionId = (req.query?.["sessionId"] ?? "").toString();
    const sttUrl =
      process.env["AEGIS_STT_URL"]?.trim() || "http://localhost:8000/transcribe";

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing sessionId." });
    }

    if (!req.body || (req.body as Buffer).length === 0) {
      return res.status(400).json({ ok: false, error: "Missing media payload." });
    }

    try {
      const sttResponse = await fetch(sttUrl, {
        method: "POST",
        headers: {
          "Content-Type": req.headers["content-type"] ?? "application/octet-stream"
        },
        body: req.body as Buffer
      });

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text().catch(() => "");
        return res.status(502).json({
          ok: false,
          error: "Transcription service failed.",
          detail: errorText
        });
      }

      const sttPayload = (await sttResponse.json()) as { text?: string };
      const transcript = (sttPayload?.text ?? "").toString().trim();

      if (!transcript) {
        return res.status(422).json({ ok: false, error: "Empty transcript returned." });
      }

      const result = await mirrorManager.reflect(sessionId, transcript);
      res.json({ ok: true, transcript, ...result });
    } catch {
      res.status(500).json({ ok: false, error: "Mirror Media Reflection Fractured" });
    }
  }
);

app.get("/api/witness", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as unknown as { flushHeaders: () => void }).flushHeaders();
  }

  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = witnessEmitter.on("resonance_event", send);

  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

function buildSummary(json: Record<string, unknown>): string {
  const mode = json["mode"] ?? "rbc";
  const flagged = Boolean(json["flagged"]);

  const total = json["score"] != null && typeof json["score"] === "object"
    ? (json["score"] as Record<string, unknown>)["total"]
    : undefined;
  const findingsCount = Array.isArray(json["findings"]) ? json["findings"].length : 0;

  const base = flagged
    ? `⚠️ ${findingsCount} findings (see details)`
    : `✅ No issues found`;

  return `${String(mode).toUpperCase()} ANALYSIS SUMMARY: ${base} (${total} total points)`;
}

app.post("/api/analyze", async (req, res) => {
  try {
    const mode = (req.body?.["mode"] ?? "rbc") as "rbc" | "arbiter" | "lint";
    const prompt = (req.body?.["prompt"] ?? "").toString();
    const notepad = (req.body?.["notepad"] ?? "").toString();
    const analysis = await runAegisCli({ mode, prompt, notepad });
    res.json({ ok: true, summary: buildSummary(analysis as Record<string, unknown>), ...analysis });
  } catch {
    res.status(500).json({ ok: false, error: "Aegis analysis failed." });
  }
});

// ---------------------------------------------------------------------------
// LLM governance routes — only mounted when a provider is configured
// ---------------------------------------------------------------------------
if (llmProvider) {
  app.use("/api/llm", createLlmRouter({
    repo:        tensorRepo,
    resonance,
    auditBridge,
    provider:    llmProvider,
    db,
  }));
  console.log("[aegis-arbiter-server] LLM routes mounted at /api/llm");
} else {
  app.use("/api/llm", (_req, res) => {
    res.status(503).json({
      ok:    false,
      error: "LLM provider not configured. Set AEGIS_LLM_PROVIDER and the corresponding API key.",
    });
  });
}

// ---------------------------------------------------------------------------
// Central error handler — MUST be the last app.use()
// Never forwards internal error details to the client.
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[aegis-arbiter-server] unhandled error:", err.message);
  if (!res.headersSent) {
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

const port = Number(process.env["PORT"] ?? 8787);
app.listen(port, () => {
  console.log(`[aegis-arbiter-server] listening on http://localhost:${port}`);
});
