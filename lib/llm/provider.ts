import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";
import type { LLMProvider } from "@/lib/llm/types";

const ANTHROPIC_MODEL = "claude-sonnet-4-5" as const;
const OPENAI_MODEL = "gpt-4o" as const;
const LOCAL_MODEL = process.env.LOCAL_LLM_MODEL || "llama3.1:8b";

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

function createLocalProvider(apiKey?: string) {
  return createOpenAI({
    baseURL: process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1",
    apiKey: apiKey || process.env.LOCAL_LLM_API_KEY || "ollama",
  });
}

export function getModel(provider?: LLMProvider, userApiKey?: string) {
  const p = provider || (process.env.LLM_PROVIDER as LLMProvider) || "anthropic";

  if (p === "local") {
    return createLocalProvider(userApiKey)(LOCAL_MODEL);
  }

  if (p === "anthropic") {
    return userApiKey
      ? createAnthropic({ apiKey: userApiKey })(ANTHROPIC_MODEL)
      : getRegistry().languageModel(`anthropic:${ANTHROPIC_MODEL}`);
  }

  return userApiKey
    ? createOpenAI({ apiKey: userApiKey })(OPENAI_MODEL)
    : getRegistry().languageModel(`openai:${OPENAI_MODEL}`);
}
