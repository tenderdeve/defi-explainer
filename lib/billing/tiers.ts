import { createServiceRoleClient } from "@/lib/auth/supabase";

export type TierName = "free" | "pro" | "byok";

export interface TierLimits {
  reports: number;
  chatMessages: number;
  suggestions: number;
}

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  free: { reports: 1, chatMessages: 5, suggestions: 3 },
  pro: { reports: Infinity, chatMessages: Infinity, suggestions: Infinity },
  byok: { reports: Infinity, chatMessages: Infinity, suggestions: Infinity },
};

export async function getUserTier(userId: string): Promise<TierName> {
  const supabase = await createServiceRoleClient();

  // Check BYOK first — any valid key means unlimited
  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("is_valid", true)
    .limit(1);

  if (keys && keys.length > 0) return "byok";

  // Check subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, current_period_end")
    .eq("user_id", userId)
    .single();

  if (
    sub?.tier === "pro" &&
    sub.current_period_end &&
    new Date(sub.current_period_end) > new Date()
  ) {
    return "pro";
  }

  return "free";
}
