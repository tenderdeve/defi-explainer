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

interface UsageRow {
  reports_count: number;
  chat_messages_count: number;
}

const USAGE_COLUMN_MAP: Record<UsageType, keyof UsageRow> = {
  reports: "reports_count",
  chatMessages: "chat_messages_count",
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getUsage(
  userId: string,
  date: string = getToday()
): Promise<{ reportsCount: number; chatMessagesCount: number }> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("usage")
    .select("reports_count, chat_messages_count")
    .eq("user_id", userId)
    .eq("date", date)
    .single<UsageRow>();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (expected for first use of day)
    throw new Error(`Failed to fetch usage: ${error.message}`);
  }

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
  const today = getToday();
  const column = USAGE_COLUMN_MAP[type];

  // Atomic upsert: insert with count=1, or increment on conflict
  const { error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_date: today,
    p_column: column,
  });

  if (error) {
    // Fallback: try upsert if RPC not available yet
    const { error: upsertError } = await supabase
      .from("usage")
      .upsert(
        { user_id: userId, date: today, [column]: 1 },
        { onConflict: "user_id,date" }
      );
    if (upsertError) {
      throw new Error(`Failed to increment usage: ${upsertError.message}`);
    }
  }
}

export async function checkLimit(
  userId: string,
  type: UsageType
): Promise<LimitCheck> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];
  const limit = limits[type];

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

  // Skip DB call for unlimited tiers
  if (limits.reports === Infinity) {
    return {
      reports: { used: 0, limit: Infinity },
      chatMessages: { used: 0, limit: Infinity },
    };
  }

  const usage = await getUsage(userId);

  return {
    reports: { used: usage.reportsCount, limit: limits.reports },
    chatMessages: { used: usage.chatMessagesCount, limit: limits.chatMessages },
  };
}
