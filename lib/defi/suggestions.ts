import Decimal from "decimal.js";
import type {
  PortfolioRiskAssessment,
  Suggestion,
  SuggestionCategory,
  SuggestionPriority,
} from "@/lib/defi/types";
import { formatUsd, formatPercent } from "@/lib/utils/format";

const MAX_SUGGESTIONS = 10;

function riskToPriority(risk: string): SuggestionPriority {
  switch (risk) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

export function generateSuggestions(
  assessment: PortfolioRiskAssessment
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 0;

  // Health factor suggestions
  for (const hf of assessment.healthFactors) {
    if (hf.riskLevel === "high" || hf.riskLevel === "critical") {
      suggestions.push({
        id: `suggestion-${++id}`,
        category: "health_factor",
        priority: riskToPriority(hf.riskLevel),
        title: `${hf.protocol} health factor is ${hf.riskLevel}`,
        description: `Your health factor on ${hf.protocol} is ${hf.healthFactor.toFixed(2)}. ${
          hf.riskLevel === "critical"
            ? "You are at immediate risk of liquidation."
            : "Consider adding collateral or repaying debt to reduce liquidation risk."
        }`,
        currentValue: `Health Factor: ${hf.healthFactor.toFixed(2)}`,
        suggestedAction:
          hf.riskLevel === "critical"
            ? "Immediately add collateral or repay debt"
            : "Add collateral or partially repay debt",
        potentialImpact: `Protect ${formatUsd(hf.totalCollateralUsd)} in collateral from liquidation`,
        relatedProtocol: hf.protocol,
        relatedAsset: null,
      });
    }
  }

  // Concentration risk suggestions
  for (const cr of assessment.concentrationRisks) {
    suggestions.push({
      id: `suggestion-${++id}`,
      category: "concentration",
      priority: riskToPriority(cr.riskLevel),
      title: `High concentration in ${cr.symbol}`,
      description: `${cr.symbol} makes up ${cr.allocationPercent.toFixed(1)}% of your portfolio (${formatUsd(cr.valueUsd)}). Consider diversifying to reduce single-asset risk.`,
      currentValue: `${cr.allocationPercent.toFixed(1)}% allocation`,
      suggestedAction: "Diversify into other assets or protocols",
      potentialImpact: "Reduced exposure to single-asset price drops",
      relatedProtocol: null,
      relatedAsset: cr.symbol,
    });
  }

  // IL suggestions
  for (const il of assessment.impermanentLossEstimates) {
    if (il.riskLevel === "high" || il.riskLevel === "critical") {
      suggestions.push({
        id: `suggestion-${++id}`,
        category: "impermanent_loss",
        priority: riskToPriority(il.riskLevel),
        title: `Impermanent loss risk in ${il.pool}`,
        description: `Estimated IL of ${il.estimatedLossPercent.toFixed(2)}% (${formatUsd(il.estimatedLossUsd)}) on ${il.protocol}. Consider moving to a concentrated liquidity range or single-sided staking.`,
        currentValue: `${il.estimatedLossPercent.toFixed(2)}% IL`,
        suggestedAction: "Consider exiting LP or moving to stable pairs",
        potentialImpact: `Avoid up to ${formatUsd(il.estimatedLossUsd)} in impermanent loss`,
        relatedProtocol: il.protocol,
        relatedAsset: `${il.token0}/${il.token1}`,
      });
    }
  }

  // Idle asset suggestions
  for (const idle of assessment.idleAssets) {
    suggestions.push({
      id: `suggestion-${++id}`,
      category: "idle_asset",
      priority: idle.potentialAnnualGainUsd.gte(500) ? "high" : "medium",
      title: `${idle.symbol} earning 0% in wallet`,
      description: `You have ${formatUsd(idle.valueUsd)} of ${idle.symbol} sitting idle. ${idle.bestProtocol} offers ${formatPercent(idle.bestAvailableApy)} APY.`,
      currentValue: "0% APY (wallet)",
      suggestedAction: `Deposit into ${idle.bestProtocol}`,
      potentialImpact: `Earn ~${formatUsd(idle.potentialAnnualGainUsd)}/year`,
      relatedProtocol: idle.bestProtocol,
      relatedAsset: idle.symbol,
    });
  }

  // Rate arbitrage suggestions
  for (const arb of assessment.rateArbitrages) {
    suggestions.push({
      id: `suggestion-${++id}`,
      category: "rate_arbitrage",
      priority: arb.potentialAnnualGainUsd.gte(500) ? "high" : "medium",
      title: `Better rate available for ${arb.symbol}`,
      description: `${arb.currentProtocol} pays ${formatPercent(arb.currentApy)} but ${arb.bestProtocol} offers ${formatPercent(arb.bestApy)} — a ${arb.differentialBps.toFixed(0)}bps improvement.`,
      currentValue: `${formatPercent(arb.currentApy)} on ${arb.currentProtocol}`,
      suggestedAction: `Move ${arb.symbol} to ${arb.bestProtocol}`,
      potentialImpact: `Earn ~${formatUsd(arb.potentialAnnualGainUsd)} more/year`,
      relatedProtocol: arb.bestProtocol,
      relatedAsset: arb.symbol,
    });
  }

  // Sort by priority (critical > high > medium > low), then by potential gain
  const priorityOrder: Record<SuggestionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  suggestions.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return 0;
  });

  return suggestions.slice(0, MAX_SUGGESTIONS);
}
