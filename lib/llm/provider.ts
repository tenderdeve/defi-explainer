import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { experimental_createProviderRegistry as createProviderRegistry } from "ai";
import type { LLMProvider } from "@/lib/llm/types";

const registry = createProviderRegistry({
  anthropic: createAnthropic(),
  openai: createOpenAI(),
});

export function getModel(provider?: LLMProvider, userApiKey?: string) {
  const p = provider || (process.env.LLM_PROVIDER as LLMProvider) || "anthropic";

  if (p === "anthropic") {
    return userApiKey
      ? createAnthropic({ apiKey: userApiKey })("claude-sonnet-4-5-20250514")
      : registry.languageModel("anthropic:claude-sonnet-4-5-20250514");
  }

  return userApiKey
    ? createOpenAI({ apiKey: userApiKey })("gpt-4o")
    : registry.languageModel("openai:gpt-4o");
}
