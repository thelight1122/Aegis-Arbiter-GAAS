import type { IncomingMessage } from "http";

// Known LLM provider endpoint domains — structural knowledge only,
// no content inspection required.
const LLM_DOMAINS = new Set([
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.mistral.ai",
  "api.groq.com",
  "api.cohere.com",
  "api.together.xyz",
  "api.perplexity.ai",
  "api.deepseek.com",
]);

// Known LLM API path prefixes — structural, publicly documented.
const LLM_PATHS = [
  "/v1/messages",
  "/v1/chat/completions",
  "/v1/complete",
  "/v1/generate",
  "/v1/embeddings",
];

// Azure OpenAI — subdomain pattern
const AZURE_OPENAI_PATTERN = /\.openai\.azure\.com$/;

// Header names whose presence (not value) indicates an LLM request.
// We check presence only — never read the value.
const LLM_HEADER_INDICATORS = [
  "anthropic-version",
  "x-goog-api-key",
];

export interface DetectionResult {
  isLLM: boolean;
  provider?: string;
}

export class LLMRelationshipDetector {
  inspect(req: IncomingMessage): DetectionResult {
    const host = this.extractHost(req);
    const path = req.url ?? "";

    // Domain match
    if (host && LLM_DOMAINS.has(host)) {
      return { isLLM: true, provider: this.providerFromHost(host) };
    }

    // Azure OpenAI subdomain
    if (host && AZURE_OPENAI_PATTERN.test(host)) {
      return { isLLM: true, provider: "Azure OpenAI" };
    }

    // Path pattern match on known LLM paths
    if (LLM_PATHS.some((p) => path.startsWith(p))) {
      // Confirm with header presence — envelope only, no value reading
      const hasLLMHeader = LLM_HEADER_INDICATORS.some(
        (h) => h in (req.headers ?? {})
      );
      if (hasLLMHeader) {
        return { isLLM: true, provider: this.providerFromHeaders(req) };
      }
    }

    // SSE response streaming — structural marker for LLM token delivery
    const contentType = req.headers["content-type"] ?? "";
    if (
      contentType.includes("text/event-stream") &&
      LLM_PATHS.some((p) => path.startsWith(p))
    ) {
      return { isLLM: true, provider: "Unknown" };
    }

    return { isLLM: false };
  }

  private extractHost(req: IncomingMessage): string | null {
    const host = req.headers["host"] ?? req.headers[":authority"];
    if (!host) return null;
    // Strip port if present
    return Array.isArray(host)
      ? host[0].split(":")[0]
      : host.split(":")[0];
  }

  private providerFromHost(host: string): string {
    if (host.includes("anthropic")) return "Anthropic";
    if (host.includes("openai")) return "OpenAI";
    if (host.includes("googleapis")) return "Google";
    if (host.includes("mistral")) return "Mistral";
    if (host.includes("groq")) return "Groq";
    if (host.includes("cohere")) return "Cohere";
    if (host.includes("together")) return "Together";
    if (host.includes("perplexity")) return "Perplexity";
    if (host.includes("deepseek")) return "DeepSeek";
    return "Unknown";
  }

  private providerFromHeaders(req: IncomingMessage): string {
    if ("anthropic-version" in req.headers) return "Anthropic";
    if ("x-goog-api-key" in req.headers) return "Google";
    return "Unknown";
  }
}
