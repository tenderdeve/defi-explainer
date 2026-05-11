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
import { truncateAddress } from "@/lib/utils/format";

interface PortfolioReportProps {
  report: string | null;
  assessment: SerializedPortfolioRiskAssessment | null;
  isLoading: boolean;
}

const CATEGORY_TABS: { value: PositionCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lending", label: "Lending" },
  { value: "liquidity", label: "LPs" },
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
              $
              {parseFloat(assessment.totalValueUsd).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>{" "}
            &middot; {assessment.positionCount} positions
          </p>
        </div>
        <RiskBadge level={assessment.overallRisk} label={`${assessment.overallRisk} risk`} />
      </div>

      {/* Report text */}
      <div className="prose prose-invert prose-sm max-w-none text-[#C9C2B0] [&_strong]:text-[#EFE9D8] [&_h2]:text-[#EFE9D8] [&_h3]:text-[#EFE9D8]">
        <div
          dangerouslySetInnerHTML={{
            __html: report
              .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
              .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2">$1</h2>')
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
              .replace(/\n\n/g, "<br/><br/>"),
          }}
        />
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
