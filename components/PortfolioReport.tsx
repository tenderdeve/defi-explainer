"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { PositionCard } from "@/components/PositionCard";
import type {
  SerializedPortfolioRiskAssessment,
  SerializedNormalizedPosition,
  PositionCategory,
} from "@/lib/defi/types";
import { formatUsd, truncateAddress } from "@/lib/utils/format";

interface PortfolioReportProps {
  report: string | null;
  assessment: SerializedPortfolioRiskAssessment | null;
  isLoading: boolean;
}

const CATEGORY_TABS: { value: PositionCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lending_supply", label: "Supply" },
  { value: "lending_borrow", label: "Borrow" },
  { value: "liquidity_pool", label: "LPs" },
  { value: "staking", label: "Staking" },
  { value: "wallet", label: "Wallet" },
];

function groupPositions(positions: SerializedNormalizedPosition[]) {
  const groups: Record<string, SerializedNormalizedPosition[]> = {};
  for (const pos of positions) {
    const cat = pos.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(pos);
  }
  return groups;
}

export function PortfolioReport({
  report,
  assessment,
  isLoading,
}: PortfolioReportProps) {
  const [activeTab, setActiveTab] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48 bg-[#1A1815]" />
        <Skeleton className="h-4 w-32 bg-[#1A1815]" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-[#1A1815]" />
          ))}
        </div>
      </div>
    );
  }

  if (!report || !assessment) return null;

  const grouped = groupPositions(assessment.positions);
  const filteredPositions =
    activeTab === "all"
      ? assessment.positions
      : (grouped[activeTab] ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#EFE9D8]">
            Portfolio Analysis
          </h2>
          <p className="text-sm text-[#8E8676] font-mono mt-1">
            {truncateAddress(assessment.walletAddress)} &middot;{" "}
            <span className="text-[#EFE9D8]">
              {formatUsd(assessment.totalValueUsd)}
            </span>{" "}
            &middot; {assessment.positionCount} positions
          </p>
        </div>
        <RiskBadge level={assessment.overallRisk} label={`${assessment.overallRisk} risk`} />
      </div>

      {/* Report text */}
      <div className="prose prose-invert prose-sm max-w-none text-[#C9C2B0]">
        {report.split("\n\n").map((block, i) => {
          const trimmed = block.trim();
          if (trimmed.startsWith("## ")) {
            return <h2 key={i} className="text-lg font-semibold text-[#EFE9D8] mt-6 mb-2">{trimmed.slice(3)}</h2>;
          }
          if (trimmed.startsWith("### ")) {
            return <h3 key={i} className="text-base font-semibold text-[#EFE9D8] mt-4 mb-2">{trimmed.slice(4)}</h3>;
          }
          if (trimmed.startsWith("- ")) {
            return (
              <ul key={i} className="ml-4 space-y-1">
                {trimmed.split("\n").map((line, j) => (
                  <li key={j} className="text-sm">{line.replace(/^- /, "")}</li>
                ))}
              </ul>
            );
          }
          return <p key={i} className="text-sm leading-relaxed">{trimmed}</p>;
        })}
      </div>

      {/* Positions */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#131210] border border-[#26221C]">
            {CATEGORY_TABS.filter(
              (tab) => tab.value === "all" || grouped[tab.value]?.length
            ).map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs data-[state=active]:bg-[#D9FF4A] data-[state=active]:text-[#0B0A08]"
              >
                {tab.label}
                {tab.value !== "all" && grouped[tab.value] && (
                  <span className="ml-1 text-[10px] opacity-60">
                    {grouped[tab.value].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-3 space-y-2">
            {filteredPositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </Tabs>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[#5E5749] border-t border-[#26221C] pt-4">
        This report is for informational purposes only and does not constitute
        financial advice. Always do your own research before making investment
        decisions.
      </p>
    </div>
  );
}
