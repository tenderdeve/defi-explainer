import type {
  PortfolioRiskAssessment,
  SerializedPortfolioRiskAssessment,
} from "@/lib/defi/types";

export function serializeAssessment(
  assessment: PortfolioRiskAssessment
): SerializedPortfolioRiskAssessment {
  return {
    walletAddress: assessment.walletAddress,
    totalValueUsd: assessment.totalValueUsd.toFixed(2),
    positionCount: assessment.positionCount,
    positions: assessment.positions.map((p) => ({
      ...p,
      valueUsd: p.valueUsd.toFixed(2),
      quantity: p.quantity.toFixed(18),
      price: p.price.toFixed(8),
      change24hPercent: p.change24hPercent?.toFixed(4) ?? null,
      change24hUsd: p.change24hUsd?.toFixed(2) ?? null,
    })),
    healthFactors: assessment.healthFactors.map((hf) => ({
      ...hf,
      healthFactor: hf.healthFactor.toFixed(4),
      totalCollateralUsd: hf.totalCollateralUsd.toFixed(2),
      totalBorrowedUsd: hf.totalBorrowedUsd.toFixed(2),
      liquidationThreshold: hf.liquidationThreshold.toFixed(4),
      availableToBorrowUsd: hf.availableToBorrowUsd.toFixed(2),
    })),
    concentrationRisks: assessment.concentrationRisks.map((cr) => ({
      ...cr,
      allocationPercent: cr.allocationPercent.toFixed(2),
      valueUsd: cr.valueUsd.toFixed(2),
    })),
    impermanentLossEstimates: assessment.impermanentLossEstimates.map((il) => ({
      ...il,
      estimatedLossPercent: il.estimatedLossPercent.toFixed(4),
      estimatedLossUsd: il.estimatedLossUsd.toFixed(2),
    })),
    idleAssets: assessment.idleAssets.map((idle) => ({
      ...idle,
      valueUsd: idle.valueUsd.toFixed(2),
      currentApy: idle.currentApy.toFixed(4),
      bestAvailableApy: idle.bestAvailableApy.toFixed(4),
      potentialAnnualGainUsd: idle.potentialAnnualGainUsd.toFixed(2),
    })),
    rateArbitrages: assessment.rateArbitrages.map((arb) => ({
      ...arb,
      currentApy: arb.currentApy.toFixed(4),
      bestApy: arb.bestApy.toFixed(4),
      differentialBps: arb.differentialBps.toFixed(0),
      potentialAnnualGainUsd: arb.potentialAnnualGainUsd.toFixed(2),
      valueUsd: arb.valueUsd.toFixed(2),
    })),
    overallRisk: assessment.overallRisk,
    analyzedAt: assessment.analyzedAt.toISOString(),
  };
}
