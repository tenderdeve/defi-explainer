import { createServiceRoleClient } from "@/lib/auth/supabase";
import { encryptKey, decryptKey, getKeyHint } from "@/lib/utils/crypto";
import type { LLMProvider } from "@/lib/llm/types";

export interface StoredKey {
  provider: LLMProvider;
  keyHint: string;
  isValid: boolean;
  createdAt: string;
}

export interface ResolvedKey {
  apiKey: string;
  source: "byok" | "platform";
}

/** Validate key format and test with a minimal API call */
async function validateApiKey(
  provider: LLMProvider,
  apiKey: string
): Promise<boolean> {
  if (provider === "anthropic") {
    if (!apiKey.startsWith("sk-ant-")) return false;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    return res.ok || res.status === 429;
  }

  if (provider === "openai") {
    if (!apiKey.startsWith("sk-")) return false;
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok || res.status === 429;
  }

  return false;
}

export async function saveUserKey(
  userId: string,
  provider: LLMProvider,
  apiKey: string
): Promise<{ success: boolean; hint?: string; error?: string }> {
  // Validate key format and test API call
  const isValid = await validateApiKey(provider, apiKey);
  if (!isValid) {
    return { success: false, error: "Invalid API key — validation failed" };
  }

  const encrypted = encryptKey(apiKey);
  const hint = getKeyHint(apiKey);
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("user_api_keys").upsert(
    {
      user_id: userId,
      provider,
      encrypted_key: encrypted,
      key_hint: hint,
      is_valid: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    throw new Error(`Failed to save key: ${error.message}`);
  }

  return { success: true, hint };
}

export async function getUserKey(
  userId: string,
  provider: LLMProvider
): Promise<string | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_valid", true)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch key: ${error.message}`);
  }

  if (!data?.encrypted_key) return null;
  return decryptKey(data.encrypted_key as string);
}

export async function deleteUserKey(
  userId: string,
  provider: LLMProvider
): Promise<void> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(`Failed to delete key: ${error.message}`);
  }
}

export async function listUserKeys(userId: string): Promise<StoredKey[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("provider, key_hint, is_valid, created_at")
    .eq("user_id", userId)
    .eq("is_valid", true);

  if (error) {
    throw new Error(`Failed to list keys: ${error.message}`);
  }

  if (!data) return [];

  return data.map((row) => ({
    provider: row.provider as LLMProvider,
    keyHint: row.key_hint as string,
    isValid: row.is_valid as boolean,
    createdAt: row.created_at as string,
  }));
}

export async function resolveApiKey(
  userId: string,
  provider: LLMProvider
): Promise<ResolvedKey> {
  const userKey = await getUserKey(userId, provider);
  if (userKey) {
    return { apiKey: userKey, source: "byok" };
  }

  // Fall back to platform key
  const envKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY;

  if (!envKey) {
    throw new Error(`No API key available for provider: ${provider}`);
  }

  return { apiKey: envKey, source: "platform" };
}
