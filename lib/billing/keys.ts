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

export async function saveUserKey(
  userId: string,
  provider: LLMProvider,
  apiKey: string
): Promise<void> {
  const encrypted = encryptKey(apiKey);
  const hint = getKeyHint(apiKey);
  const supabase = await createServiceRoleClient();

  await supabase.from("user_api_keys").upsert(
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
}

export async function getUserKey(
  userId: string,
  provider: LLMProvider
): Promise<string | null> {
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("user_api_keys")
    .select("encrypted_key, is_valid")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_valid", true)
    .single();

  if (!data?.encrypted_key) return null;
  return decryptKey(data.encrypted_key as string);
}

export async function deleteUserKey(
  userId: string,
  provider: LLMProvider
): Promise<void> {
  const supabase = await createServiceRoleClient();

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
}

export async function listUserKeys(userId: string): Promise<StoredKey[]> {
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("user_api_keys")
    .select("provider, key_hint, is_valid, created_at")
    .eq("user_id", userId);

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
