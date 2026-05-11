"use client";

import { Progress } from "@/components/ui/progress";
import type { UsageStats } from "@/lib/billing/usage";

interface UsageBannerProps {
  usage: UsageStats;
  isByok?: boolean;
}

export function UsageBanner({ usage, isByok }: UsageBannerProps) {
  if (isByok) return null;

  const chatUsed = usage.chatMessages.used;
  const chatLimit = usage.chatMessages.limit;
  const chatPercent =
    chatLimit === Infinity ? 0 : Math.round((chatUsed / chatLimit) * 100);

  const reportsUsed = usage.reports.used;
  const reportsLimit = usage.reports.limit;

  const isNearLimit = chatPercent >= 80;
  const isAtLimit = chatPercent >= 100;

  const barColor = isAtLimit
    ? "[&>div]:bg-[#FF7A6E]"
    : isNearLimit
      ? "[&>div]:bg-[#E8C25E]"
      : "[&>div]:bg-[#D9FF4A]";

  return (
    <div className="rounded-lg border border-[#26221C] bg-[#131210] p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#8E8676]">Free tier usage today</span>
        <span className="font-mono text-[#C9C2B0]">
          {chatUsed}/{chatLimit === Infinity ? "∞" : chatLimit} chats
          {" · "}
          {reportsUsed}/{reportsLimit === Infinity ? "∞" : reportsLimit} reports
        </span>
      </div>
      <Progress value={chatPercent} className={`h-1.5 bg-[#1A1815] ${barColor}`} />
    </div>
  );
}
