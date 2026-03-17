// FILE: server/src/llm/governance/GovernanceTypes.ts
//
// INVARIANT: The `response` field on GovernanceSuccess carries verbatim LLM
// output. No function in this pipeline may mutate it. Governance produces new
// data; it does not transform LLM content.

// ---------------------------------------------------------------------------
// Branded primitive types — prevent accidental string confusion at call sites
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type ModelId   = Brand<string, "ModelId">;
export type SessionId = Brand<string, "SessionId">;
export type RequestId = Brand<string, "RequestId">;

export const ModelId   = (raw: string): ModelId   => raw as ModelId;
export const SessionId = (raw: string): SessionId => raw as SessionId;
export const RequestId = (raw: string): RequestId => raw as RequestId;

// ---------------------------------------------------------------------------
// Token usage — normalised across all providers
// ---------------------------------------------------------------------------

export interface TokenUsage {
  readonly input_tokens:  number;
  readonly output_tokens: number;
  readonly provider:      string;
}

// ---------------------------------------------------------------------------
// Pre-flight and post-flight result shapes
// ---------------------------------------------------------------------------

export interface FindingResult {
  readonly type:     string;
  readonly severity: number;
  readonly evidence: string;
}

export interface PreflightResult {
  readonly pressure_score: number;
  readonly is_resonant:    boolean;
  readonly findings:       readonly FindingResult[];
  readonly tensor_id:      string;
}

export interface LensStatusResult {
  readonly physical:  number;
  readonly emotional: number;
  readonly mental:    number;
  readonly spiritual: number;
  readonly fractures: readonly string[];
}

export interface IDSResult {
  readonly identify:    string;
  readonly define:      string;
  readonly reflect:     string;
  readonly suggest:     readonly string[];
  readonly sequence:    "IDR" | "IDQRA";
  readonly question?:   string;
  readonly acknowledge?: string;
}

export interface PostflightResult {
  readonly findings:    readonly FindingResult[];
  readonly lens_status: LensStatusResult;
  readonly flow:        number;
  readonly delta:       number;
  readonly ids:         IDSResult | null;
  readonly tensor_id:   string;
}

// ---------------------------------------------------------------------------
// GovernanceEnvelope — discriminated union (success | error variants)
// All fields are readonly — envelopes are immutable audit records.
// ---------------------------------------------------------------------------

export interface GovernanceSuccess {
  readonly ok:         true;
  readonly request_id: RequestId;
  readonly session_id: SessionId;
  /** Verbatim LLM output — NEVER mutate this field. */
  readonly response:   string;
  readonly model:      ModelId;
  readonly governance: {
    readonly verdict:     "pass" | "warn" | "block";
    readonly version:     "1.0";
    readonly pre_flight:  PreflightResult;
    readonly post_flight: PostflightResult;
  };
  readonly usage: TokenUsage;
}

export interface GovernanceProviderError {
  readonly ok:       false;
  readonly code:     "LLM_PROVIDER_FRACTURED";
  /** Sanitised message — never contains raw SDK internals or key fragments. */
  readonly detail:   string;
  readonly retryable: boolean;
}

export interface GovernanceAuthError {
  readonly ok:     false;
  readonly code:   "LLM_AUTH_FRACTURED";
  readonly detail: string;
}

export interface GovernanceValidationError {
  readonly ok:    false;
  readonly code:  "LLM_VALIDATION_FRACTURED";
  readonly field: string;
  readonly detail: string;
}

export type GovernanceEnvelope =
  | GovernanceSuccess
  | GovernanceProviderError
  | GovernanceAuthError
  | GovernanceValidationError;

// ---------------------------------------------------------------------------
// Result<T, E> — used at internal pipeline stage boundaries
// ---------------------------------------------------------------------------

export type Result<T, E = GovernanceEnvelope> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// StreamChunk discriminated union — replaces `onChunk` callback pattern
// ---------------------------------------------------------------------------

export interface TextDeltaChunk {
  readonly type: "text_delta";
  readonly text: string;
}

export interface UsageChunk {
  readonly type:  "usage";
  readonly usage: TokenUsage;
}

export interface DoneChunk {
  readonly type:         "done";
  readonly finishReason: "stop" | "length";
}

export interface ErrorChunk {
  readonly type:  "error";
  readonly error: GovernanceError;
}

export type StreamChunk = TextDeltaChunk | UsageChunk | DoneChunk | ErrorChunk;

// ---------------------------------------------------------------------------
// GovernanceError hierarchy
// ---------------------------------------------------------------------------

export abstract class GovernanceError extends Error {
  abstract readonly code:       string;
  abstract readonly retryable:  boolean;
  abstract readonly statusCode: number;

  toJSON(): Record<string, unknown> {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

export class ProviderAPIError extends GovernanceError {
  readonly code       = "LLM_PROVIDER_FRACTURED" as const;
  readonly retryable:  boolean;
  readonly statusCode = 502 as const;

  constructor(
    readonly provider:       string,
    readonly upstreamStatus: number,
    message: string,
  ) {
    // NEVER pass raw SDK exception message here — sanitise before calling.
    super(message);
    this.name    = "ProviderAPIError";
    this.retryable = upstreamStatus >= 500;
  }
}

export class AuthError extends GovernanceError {
  readonly code       = "LLM_AUTH_FRACTURED" as const;
  readonly retryable  = false as const;
  readonly statusCode = 401 as const;

  constructor(readonly provider: string) {
    super(`Authentication failed for provider: ${provider}`);
    this.name = "AuthError";
  }
}

export class ValidationError extends GovernanceError {
  readonly code       = "LLM_VALIDATION_FRACTURED" as const;
  readonly retryable  = false as const;
  readonly statusCode = 400 as const;

  constructor(
    readonly field:  string,
    message: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
