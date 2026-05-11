"use client";

import type { RiskLevel } from "@/lib/defi/types";

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-[#19281C] text-[#A8E6AE] border-[#7BD389]/20",
  medium: "bg-[#2A2316] text-[#F1D78C] border-[#E8C25E]/20",
  high: "bg-[#2D1F18] text-[#F8B391] border-[#F39A6A]/20",
  critical: "bg-[#2E1916] text-[#FFA298] border-[#FF7A6E]/20",
};

const dotColors: Record<RiskLevel, string> = {
  low: "bg-[#7BD389]",
  medium: "bg-[#E8C25E]",
  high: "bg-[#F39A6A]",
  critical: "bg-[#FF7A6E]",
};

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  size?: "sm" | "md";
}

export function RiskBadge({ level, label, size = "md" }: RiskBadgeProps) {
  const text = label ?? level;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium capitalize ${riskStyles[level]} ${sizeClasses}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[level]}`} />
      {text}
    </span>
  );
}
