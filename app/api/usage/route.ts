import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { getUsageStats } from "@/lib/billing/usage";
import { getUserTier } from "@/lib/billing/tiers";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, tier] = await Promise.all([
    getUsageStats(user.id),
    getUserTier(user.id),
  ]);

  return NextResponse.json({
    ...stats,
    tier,
    isByok: tier === "byok",
  });
}
