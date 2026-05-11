export type LLMProviderName = "anthropic" | "openai";

export interface LLMConfig {
  provider: LLMProviderName;
  apiKey?: string;
  model?: string;
}
