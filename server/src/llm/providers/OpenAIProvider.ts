// FILE: server/src/llm/providers/OpenAIProvider.ts

import OpenAI from "openai";
import { ModelId } from "../governance/GovernanceTypes.js";
import { AuthError, ProviderAPIError } from "../governance/GovernanceTypes.js";
import type { StreamChunk } from "../governance/GovernanceTypes.js";
import type { ILLMProvider, LLMChatOptions, LLMChatResult } from "./ILLMProvider.js";

const PROVIDER_ID = "openai";
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
    return `OpenAI API error ${err.status}`;
  }
  if (err instanceof Error) {
    // Strip anything that looks like a bearer token or org ID.
    return err.message
      .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]")
      .replace(/org-[A-Za-z0-9_-]+/g, "[REDACTED]")
      .slice(0, 120);
  }
  return "Unknown OpenAI error";
}

export interface OpenAIProviderConfig {
  readonly apiKey:   string;
  readonly baseURL?: string;
  readonly orgId?:   string;
}

export class OpenAIProvider implements ILLMProvider {
  readonly providerId  = PROVIDER_ID;
  readonly displayName = "OpenAI GPT";

  readonly #client: OpenAI;

  constructor(config: OpenAIProviderConfig) {
    this.#client = new OpenAI({
      apiKey:       config.apiKey,
      baseURL:      config.baseURL,
      organization: config.orgId,
    });
  }

  async chat(options: LLMChatOptions): Promise<LLMChatResult> {
    try {
      const response = await this.#client.chat.completions.create(
        {
          model:      options.model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages:   options.messages.map((m) => ({
            role:    m.role,
            content: m.content,
          })),
        },
        { signal: options.signal },
      );

      const text = response.choices[0]?.message?.content ?? "";

      return {
        text,
        model: ModelId(response.model),
        usage: {
          input_tokens:  response.usage?.prompt_tokens     ?? 0,
          output_tokens: response.usage?.completion_tokens ?? 0,
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
    let accumulated  = "";
    let inputTokens  = 0;
    let outputTokens = 0;
    let finalModel   = options.model as string;

    try {
      const stream = await this.#client.chat.completions.create(
        {
          model:          options.model,
          max_tokens:     options.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages:       options.messages.map((m) => ({
            role:    m.role,
            content: m.content,
          })),
          stream:         true,
          // Required to receive token counts in streaming mode.
          stream_options: { include_usage: true },
        },
        { signal: options.signal },
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          yield { type: "text_delta", text: delta };
        }

        // Usage arrives in the final chunk when stream_options.include_usage is set.
        if (chunk.usage) {
          inputTokens  = chunk.usage.prompt_tokens     ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }

        if (chunk.model) {
          finalModel = chunk.model;
        }
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
      const list = await (this.#client.models.list as (opts?: any) => Promise<{ data: Array<{ id: string }> }>)(
        signal ? { signal } : undefined,
      );
      return list.data
        .filter((m) => m.id.startsWith("gpt-"))
        .map((m) => ModelId(m.id));
    } catch {
      return [
        ModelId("gpt-4o"),
        ModelId("gpt-4o-mini"),
        ModelId("gpt-4-turbo"),
      ];
    }
  }
}
