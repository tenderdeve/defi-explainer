import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";
import type { LLMProvider } from "@/lib/llm/types";

const ANTHROPIC_MODEL = "claude-sonnet-4-5" as const;
const OPENAI_MODEL = "gpt-4o" as const;

let _registry: ReturnType<typeof createProviderRegistry> | null = null;

function getRegistry() {
  if (!_registry) {
    _registry = createProviderRegistry({
      anthropic: createAnthropic(),
      openai: createOpenAI(),
    });
  }
  return _registry;
}

export function getModel(provider?: LLMProvider, userApiKey?: string) {
  const p = provider || (process.env.LLM_PROVIDER as LLMProvider) || "anthropic";

  if (p === "anthropic") {
    return userApiKey
      ? createAnthropic({ apiKey: userApiKey })(ANTHROPIC_MODEL)
      : getRegistry().languageModel(`anthropic:${ANTHROPIC_MODEL}`);
  }

  return userApiKey
    ? createOpenAI({ apiKey: userApiKey })(OPENAI_MODEL)
    : getRegistry().languageModel(`openai:${OPENAI_MODEL}`);
}
