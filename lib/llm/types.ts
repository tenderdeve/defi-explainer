export type LLMProvider = "anthropic" | "openai" | "local";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
}

// The "local" (Ollama / self-hosted) provider is a development convenience only.
// In production builds it is disabled — users must bring an Anthropic/OpenAI key.
// NODE_ENV is inlined by Next at build time on both server and client.
export const LOCAL_PROVIDER_ENABLED = process.env.NODE_ENV !== "production";

export const AVAILABLE_PROVIDERS: LLMProvider[] = LOCAL_PROVIDER_ENABLED
  ? ["anthropic", "openai", "local"]
  : ["anthropic", "openai"];

/** True if a provider may be used in the current environment. */
export function isProviderAllowed(provider: LLMProvider): boolean {
  return provider !== "local" || LOCAL_PROVIDER_ENABLED;
}
