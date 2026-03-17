// FILE: server/src/llm/providers/AnthropicProvider.ts

import Anthropic from "@anthropic-ai/sdk";
import { ModelId } from "../governance/GovernanceTypes.js";
import { AuthError, ProviderAPIError } from "../governance/GovernanceTypes.js";
import type { StreamChunk } from "../governance/GovernanceTypes.js";
import type { ILLMProvider, LLMChatOptions, LLMChatResult } from "./ILLMProvider.js";

const PROVIDER_ID = "anthropic";
const DEFAULT_MAX_TOKENS = 4096;

/** Duck-typed HTTP error shape common to SDK error classes. */
interface SDKStatusError { status: number }

function isStatusError(e: unknown): e is SDKStatusError {
  return e !== null && typeof e === "object" && "status" in e && typeof (e as SDKStatusError).status === "number";
}

function isAuthError(e: unknown): boolean {
  return isStatusError(e) && (e as SDKStatusError).status === 401;
}

/** Sanitise an SDK error — never expose raw SDK internals or key fragments. */
function sanitise(err: unknown): string {
  if (isStatusError(err)) {
    return `Anthropic API error ${err.status}`;
  }
  if (err instanceof Error) {
    // Strip anything that looks like an API key (sk-ant-...) or Bearer token.
    return err.message.replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED]").slice(0, 120);
  }
  return "Unknown Anthropic error";
}

export interface AnthropicProviderConfig {
  readonly apiKey:   string;
  readonly baseURL?: string;
}

export class AnthropicProvider implements ILLMProvider {
  readonly providerId  = PROVIDER_ID;
  readonly displayName = "Anthropic Claude";

  readonly #client: Anthropic;

  constructor(config: AnthropicProviderConfig) {
    this.#client = new Anthropic({
      apiKey:  config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async chat(options: LLMChatOptions): Promise<LLMChatResult> {
    try {
      const response = await this.#client.messages.create(
        {
          model:      options.model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages:   options.messages.map((m) => ({
            role:    m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        },
        { signal: options.signal },
      );

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      return {
        text,
        model: ModelId(response.model),
        usage: {
          input_tokens:  response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          provider:      PROVIDER_ID,
        },
      };
    } catch (err) {
      if (isAuthError(err)) throw new AuthError(PROVIDER_ID);
      const status = isStatusError(err) ? err.status : 502;
      throw new ProviderAPIError(PROVIDER_ID, status, sanitise(err));
    }
  }

  async *stream(
    options: LLMChatOptions,
  ): AsyncGenerator<StreamChunk, LLMChatResult, undefined> {
    let accumulated = "";

    try {
      const stream = this.#client.messages.stream(
        {
          model:      options.model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages:   options.messages.map((m) => ({
            role:    m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        },
        { signal: options.signal },
      );

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          accumulated += event.delta.text;
          yield { type: "text_delta", text: event.delta.text };
        }
      }

      // Usage is only available after the stream completes.
      const final = await stream.finalMessage();

      yield {
        type:  "usage",
        usage: {
          input_tokens:  final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          provider:      PROVIDER_ID,
        },
      };

      yield { type: "done", finishReason: "stop" };

      return {
        text:  accumulated,
        model: ModelId(final.model),
        usage: {
          input_tokens:  final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          provider:      PROVIDER_ID,
        },
      };
    } catch (err) {
      if (isAuthError(err)) {
        const authErr = new AuthError(PROVIDER_ID);
        yield { type: "error", error: authErr };
        throw authErr;
      }
      const status = isStatusError(err) ? err.status : 502;
      const providerErr = new ProviderAPIError(PROVIDER_ID, status, sanitise(err));
      yield { type: "error", error: providerErr };
      throw providerErr;
    }
  }

  async listModels(signal?: AbortSignal): Promise<readonly ModelId[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (this.#client.models.list as (opts?: any) => Promise<{ data: Array<{ id: string }> }>)(
        signal ? { signal } : undefined,
      );
      return page.data.map((m) => ModelId(m.id));
    } catch {
      // Fallback to well-known models if the API call fails.
      return [
        ModelId("claude-opus-4-5"),
        ModelId("claude-sonnet-4-5"),
        ModelId("claude-haiku-4-5"),
      ];
    }
  }
}
