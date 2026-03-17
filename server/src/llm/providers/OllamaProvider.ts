// FILE: server/src/llm/providers/OllamaProvider.ts
//
// Fetch-based NDJSON client — no extra dependency beyond Node.js built-ins.
// SSRF protection: baseUrl is validated against an allowlist at construction time.

import { ModelId } from "../governance/GovernanceTypes.js";
import { ProviderAPIError } from "../governance/GovernanceTypes.js";
import type { StreamChunk } from "../governance/GovernanceTypes.js";
import type { ILLMProvider, LLMChatOptions, LLMChatResult } from "./ILLMProvider.js";

const PROVIDER_ID = "ollama";

/** Allowlist of schemes + hostname patterns permitted for Ollama base URL. */
const ALLOWED_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d{1,5})?(\/|$)/;

function validateOllamaUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`AEGIS_OLLAMA_URL is not a valid URL: ${raw}`);
  }
  if (!ALLOWED_HOSTS.test(url.toString())) {
    throw new Error(
      `AEGIS_OLLAMA_URL must point to localhost — SSRF protection prevents external hosts (got: ${url.hostname})`,
    );
  }
  return url;
}

export interface OllamaProviderConfig {
  /** Must be a localhost URL — e.g. http://localhost:11434 */
  readonly baseUrl: string;
}

interface OllamaChatMessage {
  role:    "user" | "assistant" | "system";
  content: string;
}

interface OllamaChatResponseChunk {
  model?:   string;
  message?: { role?: string; content?: string };
  done:     boolean;
  prompt_eval_count?: number;
  eval_count?:        number;
}

interface OllamaModelEntry {
  name: string;
}

export class OllamaProvider implements ILLMProvider {
  readonly providerId  = PROVIDER_ID;
  readonly displayName = "Ollama (local)";

  readonly #baseUrl: URL;

  constructor(config: OllamaProviderConfig) {
    this.#baseUrl = validateOllamaUrl(config.baseUrl);
  }

  #endpoint(path: string): string {
    return new URL(path, this.#baseUrl).toString();
  }

  async chat(options: LLMChatOptions): Promise<LLMChatResult> {
    const response = await fetch(this.#endpoint("/api/chat"), {
      method:   "POST",
      headers:  { "Content-Type": "application/json" },
      body:     JSON.stringify({
        model:    options.model,
        messages: options.messages as OllamaChatMessage[],
        stream:   false,
      }),
      signal:   options.signal,
      redirect: "error",   // SSRF: never follow redirects
    });

    if (!response.ok) {
      throw new ProviderAPIError(
        PROVIDER_ID,
        response.status,
        `Ollama HTTP ${response.status}`,
      );
    }

    const body = (await response.json()) as OllamaChatResponseChunk;
    const text = body.message?.content ?? "";

    return {
      text,
      model: ModelId(body.model ?? options.model),
      usage: {
        input_tokens:  body.prompt_eval_count ?? 0,
        output_tokens: body.eval_count        ?? 0,
        provider:      PROVIDER_ID,
      },
    };
  }

  async *stream(
    options: LLMChatOptions,
  ): AsyncGenerator<StreamChunk, LLMChatResult, undefined> {
    let accumulated  = "";
    let inputTokens  = 0;
    let outputTokens = 0;
    let finalModel   = options.model as string;

    const response = await fetch(this.#endpoint("/api/chat"), {
      method:   "POST",
      headers:  { "Content-Type": "application/json" },
      body:     JSON.stringify({
        model:    options.model,
        messages: options.messages as OllamaChatMessage[],
        stream:   true,
      }),
      signal:   options.signal,
      redirect: "error",   // SSRF: never follow redirects
    });

    if (!response.ok || !response.body) {
      throw new ProviderAPIError(
        PROVIDER_ID,
        response.status,
        `Ollama HTTP ${response.status}`,
      );
    }

    const reader  = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let   buffer  = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let chunk: OllamaChatResponseChunk;
          try {
            chunk = JSON.parse(trimmed) as OllamaChatResponseChunk;
          } catch {
            continue;  // skip malformed lines
          }

          if (chunk.model) finalModel = chunk.model;

          const delta = chunk.message?.content;
          if (delta) {
            accumulated += delta;
            yield { type: "text_delta", text: delta };
          }

          // Final chunk carries token counts.
          if (chunk.done) {
            inputTokens  = chunk.prompt_eval_count ?? 0;
            outputTokens = chunk.eval_count        ?? 0;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield {
      type:  "usage",
      usage: {
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        provider:      PROVIDER_ID,
      },
    };

    yield { type: "done", finishReason: "stop" };

    return {
      text:  accumulated,
      model: ModelId(finalModel),
      usage: {
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        provider:      PROVIDER_ID,
      },
    };
  }

  async listModels(signal?: AbortSignal): Promise<readonly ModelId[]> {
    try {
      const response = await fetch(this.#endpoint("/api/tags"), {
        signal,
        redirect: "error",
      });
      if (!response.ok) return [];
      const body = (await response.json()) as { models?: OllamaModelEntry[] };
      return (body.models ?? []).map((m) => ModelId(m.name));
    } catch {
      return [];
    }
  }
}
