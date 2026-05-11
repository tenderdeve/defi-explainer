import Decimal from "decimal.js";
import type { RiskLevel } from "@/lib/defi/types";

export function formatUsd(value: Decimal | number | string): string {
  const d = new Decimal(value);
  if (d.isZero()) return "$0.00";

  const abs = d.abs();
  const sign = d.isNegative() ? "-" : "";

  if (abs.gte(1_000_000)) {
    return `${sign}$${abs.div(1_000_000).toFixed(2)}M`;
  }
  if (abs.gte(1_000)) {
    return `${sign}$${abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  if (abs.lt(0.01)) {
    return `${sign}$${abs.toFixed(6)}`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatPercent(value: Decimal | number | string): string {
  const d = new Decimal(value);
  const rounded = d.toFixed(2);
  if (rounded === "0.00" || rounded === "-0.00") return "0.00%";
  const sign = d.isPositive() ? "+" : "";
  return `${sign}${rounded}%`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(value: Decimal | number | string): string {
  const d = new Decimal(value);
  if (d.isZero()) return "0";

  const abs = d.abs();
  const sign = d.isNegative() ? "-" : "";
  if (abs.gte(1_000_000)) {
    return `${sign}${abs.div(1_000_000).toFixed(2)}M`;
  }
  if (abs.gte(1_000)) {
    return `${sign}${abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  if (abs.lt(0.001)) {
    return d.toFixed(6);
  }
  return d.toFixed(4);
}

export function formatHealthFactor(value: Decimal | number | string): string {
  const d = new Decimal(value);
  if (d.gte(10)) return ">10.0";
  return d.toFixed(2);
}

const riskColors: Record<RiskLevel, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function riskLevelToColor(level: RiskLevel): string {
  return riskColors[level];
}
