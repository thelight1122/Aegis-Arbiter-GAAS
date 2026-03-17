// FILE: server/src/llm/providers/ILLMProvider.ts

import type { ModelId, StreamChunk, TokenUsage } from "../governance/GovernanceTypes.js";

// ---------------------------------------------------------------------------
// Chat request options — shared by all provider implementations
// ---------------------------------------------------------------------------

export interface LLMMessage {
  readonly role:    "user" | "assistant" | "system";
  readonly content: string;
}

export interface LLMChatOptions {
  readonly model:     ModelId;
  readonly messages:  readonly LLMMessage[];
  readonly maxTokens?: number;
  /** Every provider MUST honour this signal for client-disconnect cleanup. */
  readonly signal?:   AbortSignal;
}

// ---------------------------------------------------------------------------
// Chat result — synchronous (non-streaming) response
// ---------------------------------------------------------------------------

export interface LLMChatResult {
  readonly text:  string;
  readonly model: ModelId;
  readonly usage: TokenUsage;
}

// ---------------------------------------------------------------------------
// ILLMProvider — model-agnostic interface
//
// Streaming is expressed as AsyncGenerator<StreamChunk, LLMChatResult> so the
// governance layer can compose over the generator without callbacks.
// ---------------------------------------------------------------------------

export interface ILLMProvider {
  /** Machine identifier for this provider (e.g. "anthropic", "openai"). */
  readonly providerId:   string;
  /** Human-readable label shown in the UI. */
  readonly displayName:  string;

  /**
   * Sends a single-turn chat request and returns the full response.
   * Use for the `/api/llm/chat` endpoint.
   */
  chat(options: LLMChatOptions): Promise<LLMChatResult>;

  /**
   * Streams a response as an AsyncGenerator of StreamChunk values.
   * The generator's return value (via `return`) is the final LLMChatResult.
   * Use for the `/api/llm/stream` endpoint.
   */
  stream(options: LLMChatOptions): AsyncGenerator<StreamChunk, LLMChatResult, undefined>;

  /**
   * Returns the list of available model IDs for this provider.
   */
  listModels(signal?: AbortSignal): Promise<readonly ModelId[]>;
}
