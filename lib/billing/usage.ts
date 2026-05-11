import { createServiceRoleClient } from "@/lib/auth/supabase";
import { getUserTier, TIER_LIMITS } from "@/lib/billing/tiers";

export type UsageType = "reports" | "chatMessages";

export interface UsageStats {
  reports: { used: number; limit: number };
  chatMessages: { used: number; limit: number };
}

export interface LimitCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

const USAGE_COLUMN_MAP: Record<UsageType, string> = {
  reports: "reports_count",
  chatMessages: "chat_messages_count",
};

export async function getUsage(
  userId: string,
  date: string = new Date().toISOString().split("T")[0]
): Promise<{ reportsCount: number; chatMessagesCount: number }> {
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("usage")
    .select("reports_count, chat_messages_count")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  return {
    reportsCount: data?.reports_count ?? 0,
    chatMessagesCount: data?.chat_messages_count ?? 0,
  };
}

export async function incrementUsage(
  userId: string,
  type: UsageType
): Promise<void> {
  const supabase = await createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];
  const column = USAGE_COLUMN_MAP[type];

  // Upsert: create row if not exists, increment if exists
  const { data: existing } = await supabase
    .from("usage")
    .select("id, " + column)
    .eq("user_id", userId)
    .eq("date", today)
    .single<Record<string, unknown>>();

  if (existing) {
    await supabase
      .from("usage")
      .update({ [column]: ((existing[column] as number) ?? 0) + 1 })
      .eq("id", existing.id as string);
  } else {
    await supabase.from("usage").insert({
      user_id: userId,
      date: today,
      [column]: 1,
    });
  }
}

export async function checkLimit(
  userId: string,
  type: UsageType
): Promise<LimitCheck> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  const limitKey = type === "reports" ? "reports" : "chatMessages";
  const limit = limits[limitKey];

  // Unlimited tiers
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const usage = await getUsage(userId);
  const used =
    type === "reports" ? usage.reportsCount : usage.chatMessagesCount;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
  };
}

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];
  const usage = await getUsage(userId);

  return {
    reports: { used: usage.reportsCount, limit: limits.reports },
    chatMessages: { used: usage.chatMessagesCount, limit: limits.chatMessages },
  };
}
