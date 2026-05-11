"use client";

import type { SerializedNormalizedPosition } from "@/lib/defi/types";
import { formatUsd, formatPercent, formatTokenAmount } from "@/lib/utils/format";

interface PositionCardProps {
  position: SerializedNormalizedPosition;
  showProtocol?: boolean;
}

export function PositionCard({
  position,
  showProtocol = true,
}: PositionCardProps) {
  const hasChange = position.change24hPercent !== null;
  const isPositive = hasChange && !position.change24hPercent!.startsWith("-");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#26221C] bg-[#141210] p-3 hover:border-[#383229] transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1A1815] flex items-center justify-center overflow-hidden">
        {position.iconUrl ? (
          <img
            src={position.iconUrl}
            alt={position.symbol}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-mono text-[#8E8676]">
            {position.symbol.slice(0, 3)}
          </span>
        )}
      </div>

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#EFE9D8] truncate">
            {position.name}
          </span>
          {showProtocol && position.protocol && (
            <span className="text-xs text-[#8E8676] bg-[#1A1815] px-1.5 py-0.5 rounded">
              {position.protocol}
            </span>
          )}
        </div>
        <span className="text-xs text-[#8E8676]">
          {formatTokenAmount(position.quantity)} {position.symbol}
        </span>
      </div>

      {/* Value + change */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium font-mono text-[#EFE9D8]">
          {formatUsd(position.valueUsd)}
        </div>
        {hasChange && (
          <div
            className={`text-xs font-mono ${
              isPositive ? "text-[#7BD389]" : "text-[#FF8C7E]"
            }`}
          >
            {formatPercent(position.change24hPercent!)}
          </div>
        )}
      </div>
    </div>
  );
}
