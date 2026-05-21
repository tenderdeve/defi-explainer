import { createServiceRoleClient } from "@/lib/auth/supabase";
import { encryptKey, decryptKey, getKeyHint } from "@/lib/utils/crypto";
import type { LLMProvider } from "@/lib/llm/types";

export interface StoredKey {
  provider: LLMProvider;
  keyHint: string;
  isValid: boolean;
  createdAt: string;
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

  if (provider === "local") {
    const baseUrl = process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1";
    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return false;
}

export async function saveUserKey(
  walletAddress: string,
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
      wallet_address: walletAddress.toLowerCase(),
      provider,
      encrypted_key: encrypted,
      key_hint: hint,
      is_valid: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet_address,provider" }
  );

  if (error) {
    throw new Error(`Failed to save key: ${error.message}`);
  }

  return { success: true, hint };
}

export async function getUserKey(
  walletAddress: string,
  provider: LLMProvider
): Promise<string | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("wallet_address", walletAddress.toLowerCase())
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
  walletAddress: string,
  provider: LLMProvider
): Promise<void> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("provider", provider);

  if (error) {
    throw new Error(`Failed to delete key: ${error.message}`);
  }
}

export async function listUserKeys(
  walletAddress: string
): Promise<StoredKey[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("provider, key_hint, is_valid, created_at")
    .eq("wallet_address", walletAddress.toLowerCase())
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

/** Custom error so routes can map "no saved key" to a 400 with a clear message. */
export class MissingApiKeyError extends Error {
  constructor(provider: LLMProvider) {
    super(`No ${provider} API key saved — add one in Settings.`);
    this.name = "MissingApiKeyError";
  }
}

/** Resolve the wallet's own (BYOK) key for a provider. No platform fallback. */
export async function resolveApiKey(
  walletAddress: string,
  provider: LLMProvider
): Promise<string> {
  const userKey = await getUserKey(walletAddress, provider);
  if (!userKey) {
    throw new MissingApiKeyError(provider);
  }
  return userKey;
}
