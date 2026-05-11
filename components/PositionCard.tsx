"use client";

import type { SerializedNormalizedPosition } from "@/lib/defi/types";

interface PositionCardProps {
  position: SerializedNormalizedPosition;
  showProtocol?: boolean;
}

export function PositionCard({
  position,
  showProtocol = true,
}: PositionCardProps) {
  const changePercent = position.change24hPercent
    ? parseFloat(position.change24hPercent)
    : null;
  const isPositive = changePercent !== null && changePercent >= 0;

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
          {parseFloat(position.quantity).toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}{" "}
          {position.symbol}
        </span>
      </div>

      {/* Value + change */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium font-mono text-[#EFE9D8]">
          $
          {parseFloat(position.valueUsd).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        {changePercent !== null && (
          <div
            className={`text-xs font-mono ${
              isPositive ? "text-[#7BD389]" : "text-[#FF8C7E]"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}
