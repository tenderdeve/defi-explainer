"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/RiskBadge";
import type { Suggestion, SuggestionCategory } from "@/lib/defi/types";

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
}

const FILTER_TABS: {
  value: "all" | SuggestionCategory;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "rate_arbitrage", label: "Yield" },
  { value: "health_factor", label: "Risk" },
  { value: "idle_asset", label: "Idle" },
  { value: "concentration", label: "Diversify" },
];

const categoryIcons: Record<SuggestionCategory, string> = {
  health_factor: "🛡️",
  concentration: "📊",
  impermanent_loss: "📉",
  idle_asset: "💤",
  rate_arbitrage: "📈",
};

export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? suggestions
      : suggestions.filter((s) => s.category === filter);

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-3xl mb-3">✨</span>
        <p className="text-sm text-[#8E8676]">
          No optimization opportunities detected. Your portfolio looks well
          positioned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#EFE9D8]">
          Opportunities
        </h3>
        <span className="text-xs text-[#8E8676]">
          {suggestions.length} detected
        </span>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-[#131210] border border-[#26221C]">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs data-[state=active]:bg-[#D9FF4A] data-[state=active]:text-[#0B0A08]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {filtered.map((suggestion) => (
          <div
            key={suggestion.id}
            className="rounded-lg border border-[#26221C] bg-[#141210] p-4 hover:border-[#383229] transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">
                {categoryIcons[suggestion.category]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#EFE9D8]">
                    {suggestion.title}
                  </span>
                  <RiskBadge level={suggestion.priority} size="sm" />
                </div>
                <p className="text-xs text-[#8E8676] leading-relaxed">
                  {suggestion.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-[#5E5749]">
                    Current: {suggestion.currentValue}
                  </span>
                  <span className="text-[#D9FF4A]">
                    Impact: {suggestion.potentialImpact}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
