// FILE: server/src/llm/providers/LLMProviderFactory.ts
//
// SINGLETON — call LLMProviderFactory.create() ONCE at server startup and
// inject the resulting ILLMProvider instance via createLlmRouter(deps).
//
// Never call this inside a request handler: SDK clients maintain internal
// HTTP connection pools that must survive across requests.

import type { ILLMProvider } from "./ILLMProvider.js";
import { AnthropicProvider } from "./AnthropicProvider.js";
import { OpenAIProvider }    from "./OpenAIProvider.js";
import { OllamaProvider }    from "./OllamaProvider.js";

export type SupportedProvider = "anthropic" | "openai" | "ollama";

const SUPPORTED: readonly SupportedProvider[] = ["anthropic", "openai", "ollama"];

function isSupportedProvider(raw: string): raw is SupportedProvider {
  return (SUPPORTED as readonly string[]).includes(raw);
}

export class LLMProviderFactory {
  /**
   * Creates a provider instance from environment variables.
   *
   * Required env vars:
   *   AEGIS_LLM_PROVIDER — "anthropic" | "openai" | "ollama"
   *
   * Per-provider env vars:
   *   AEGIS_ANTHROPIC_API_KEY  — required for anthropic
   *   AEGIS_OPENAI_API_KEY     — required for openai
   *   AEGIS_OLLAMA_URL         — required for ollama (default: http://localhost:11434)
   *
   * Throws synchronously if required env vars are missing so the server fails
   * fast at startup rather than on the first LLM request.
   */
  static create(): ILLMProvider {
    const raw = (process.env["AEGIS_LLM_PROVIDER"] ?? "").trim().toLowerCase();

    if (!raw) {
      throw new Error(
        "AEGIS_LLM_PROVIDER env var is not set. " +
        `Supported values: ${SUPPORTED.join(", ")}`,
      );
    }

    if (!isSupportedProvider(raw)) {
      throw new Error(
        `Unknown provider "${raw}". Supported: ${SUPPORTED.join(", ")}`,
      );
    }

    switch (raw) {
      case "anthropic": {
        const apiKey = process.env["AEGIS_ANTHROPIC_API_KEY"]?.trim();
        if (!apiKey) {
          throw new Error("AEGIS_ANTHROPIC_API_KEY env var is required for provider=anthropic");
        }
        return new AnthropicProvider({ apiKey });
      }

      case "openai": {
        const apiKey = process.env["AEGIS_OPENAI_API_KEY"]?.trim();
        if (!apiKey) {
          throw new Error("AEGIS_OPENAI_API_KEY env var is required for provider=openai");
        }
        return new OpenAIProvider({ apiKey });
      }

      case "ollama": {
        const baseUrl = (
          process.env["AEGIS_OLLAMA_URL"]?.trim() || "http://localhost:11434"
        );
        return new OllamaProvider({ baseUrl });
      }
    }
  }
}
