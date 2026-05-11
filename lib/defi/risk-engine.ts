import Decimal from "decimal.js";
import type {
  NormalizedPosition,
  PortfolioRiskAssessment,
  HealthFactorAssessment,
  ConcentrationRisk,
  ImpermanentLossEstimate,
  IdleAsset,
  RateArbitrage,
  RiskLevel,
  DefiLlamaPool,
} from "@/lib/defi/types";
import { fetchProtocolHealthData } from "@/lib/defi/subgraphs";
import { fetchAllPools, findBestYieldForToken, getYieldComparison } from "@/lib/defi/defillama";

// ─── Thresholds ──────────────────────────────────────────────────────────────

const CONCENTRATION_THRESHOLDS = {
  low: new Decimal(25),
  medium: new Decimal(50),
  high: new Decimal(75),
};

const IL_THRESHOLDS = {
  low: new Decimal(2),
  medium: new Decimal(5),
  high: new Decimal(10),
};

const RATE_ARBITRAGE_MIN_BPS = new Decimal(50);
const RATE_ARBITRAGE_MIN_ANNUAL_GAIN = new Decimal(50);
const IDLE_ASSET_MIN_VALUE = new Decimal(100);
const IDLE_ASSET_MIN_APY = new Decimal(1);

// ─── Risk Level Helpers ──────────────────────────────────────────────────────

function concentrationRiskLevel(pct: Decimal): RiskLevel {
  if (pct.gt(CONCENTRATION_THRESHOLDS.high)) return "critical";
  if (pct.gte(CONCENTRATION_THRESHOLDS.medium)) return "high";
  if (pct.gte(CONCENTRATION_THRESHOLDS.low)) return "medium";
  return "low";
}

function ilRiskLevel(pct: Decimal): RiskLevel {
  if (pct.gte(IL_THRESHOLDS.high)) return "critical";
  if (pct.gte(IL_THRESHOLDS.medium)) return "high";
  if (pct.gte(IL_THRESHOLDS.low)) return "medium";
  return "low";
}

// ─── Analysis Functions ──────────────────────────────────────────────────────

export async function analyzeHealthFactors(
  walletAddress: string
): Promise<HealthFactorAssessment[]> {
  try {
    return await fetchProtocolHealthData(walletAddress);
  } catch {
    return [];
  }
}

export function analyzeConcentration(
  positions: NormalizedPosition[]
): ConcentrationRisk[] {
  const totalValue = positions.reduce(
    (sum, p) => sum.add(p.valueUsd.abs()),
    new Decimal(0)
  );

  if (totalValue.isZero()) return [];

  // Group by symbol
  const grouped = new Map<string, { valueUsd: Decimal; name: string }>();
  for (const pos of positions) {
    const existing = grouped.get(pos.symbol);
    if (existing) {
      existing.valueUsd = existing.valueUsd.add(pos.valueUsd.abs());
    } else {
      grouped.set(pos.symbol, {
        valueUsd: pos.valueUsd.abs(),
        name: pos.name,
      });
    }
  }

  const risks: ConcentrationRisk[] = [];
  for (const [symbol, data] of grouped) {
    const pct = data.valueUsd.div(totalValue).mul(100);
    const level = concentrationRiskLevel(pct);
    if (level !== "low") {
      risks.push({
        asset: data.name,
        symbol,
        allocationPercent: pct,
        valueUsd: data.valueUsd,
        riskLevel: level,
      });
    }
  }

  return risks.sort((a, b) =>
    b.allocationPercent.cmp(a.allocationPercent)
  );
}

/**
 * IL = 2*sqrt(r) / (1+r) - 1
 * where r = currentPrice / entryPrice (price ratio)
 */
export function estimateImpermanentLoss(
  positions: NormalizedPosition[]
): ImpermanentLossEstimate[] {
  // Only applies to LP positions
  const lpPositions = positions.filter((p) => p.category === "liquidity_pool");

  return lpPositions.map((pos) => {
    // Without entry price data, estimate based on 24h change as proxy
    const changePercent = pos.change24hPercent
      ? pos.change24hPercent.abs()
      : new Decimal(0);

    // Rough IL estimate: IL ≈ priceChange^2 / (4 * (1 + priceChange))
    // Simplified approximation
    const priceRatio = new Decimal(1).add(changePercent.div(100));
    const sqrtRatio = priceRatio.sqrt();
    const ilPercent = new Decimal(2)
      .mul(sqrtRatio)
      .div(new Decimal(1).add(priceRatio))
      .sub(1)
      .abs()
      .mul(100);

    const ilUsd = pos.valueUsd.mul(ilPercent).div(100);

    return {
      protocol: pos.protocol ?? "Unknown",
      pool: pos.name,
      token0: pos.symbol.split("/")[0] ?? pos.symbol,
      token1: pos.symbol.split("/")[1] ?? "?",
      estimatedLossPercent: ilPercent,
      estimatedLossUsd: ilUsd,
      riskLevel: ilRiskLevel(ilPercent),
    };
  });
}

export function detectIdleAssets(
  positions: NormalizedPosition[],
  pools: DefiLlamaPool[]
): IdleAsset[] {
  const walletPositions = positions.filter(
    (p) => p.category === "wallet" && p.valueUsd.gte(IDLE_ASSET_MIN_VALUE)
  );

  const idle: IdleAsset[] = [];
  for (const pos of walletPositions) {
    const best = findBestYieldForToken(pos.symbol, pools);
    if (best && best.apy.gte(IDLE_ASSET_MIN_APY)) {
      const annualGain = pos.valueUsd.mul(best.apy).div(100);
      idle.push({
        symbol: pos.symbol,
        valueUsd: pos.valueUsd,
        currentApy: new Decimal(0),
        bestAvailableApy: best.apy,
        bestProtocol: best.pool.project,
        potentialAnnualGainUsd: annualGain,
      });
    }
  }

  return idle.sort((a, b) =>
    b.potentialAnnualGainUsd.cmp(a.potentialAnnualGainUsd)
  );
}

export function detectRateArbitrages(
  positions: NormalizedPosition[],
  pools: DefiLlamaPool[]
): RateArbitrage[] {
  const yieldPositions = positions.filter(
    (p) =>
      (p.category === "lending_supply" || p.category === "staking") &&
      p.protocol
  );

  const arbitrages: RateArbitrage[] = [];
  for (const pos of yieldPositions) {
    if (!pos.protocol) continue;

    const comparison = getYieldComparison(pos.protocol, pos.symbol, pools);
    if (!comparison) continue;

    if (
      comparison.differentialBps.gte(RATE_ARBITRAGE_MIN_BPS) &&
      pos.valueUsd.mul(comparison.bestApy.sub(comparison.currentApy)).div(100).gte(RATE_ARBITRAGE_MIN_ANNUAL_GAIN)
    ) {
      arbitrages.push({
        symbol: pos.symbol,
        currentProtocol: comparison.currentProtocol,
        currentApy: comparison.currentApy,
        bestProtocol: comparison.bestProtocol,
        bestApy: comparison.bestApy,
        differentialBps: comparison.differentialBps,
        potentialAnnualGainUsd: pos.valueUsd
          .mul(comparison.bestApy.sub(comparison.currentApy))
          .div(100),
        valueUsd: pos.valueUsd,
      });
    }
  }

  return arbitrages.sort((a, b) =>
    b.potentialAnnualGainUsd.cmp(a.potentialAnnualGainUsd)
  );
}

export function calculateOverallRisk(
  healthFactors: HealthFactorAssessment[],
  concentrationRisks: ConcentrationRisk[],
  ilEstimates: ImpermanentLossEstimate[],
  positionCount: number
): RiskLevel {
  // Weighted scoring: HF 40%, concentration 30%, IL 20%, diversity 10%
  const riskValue: Record<RiskLevel, Decimal> = {
    low: new Decimal(0),
    medium: new Decimal(1),
    high: new Decimal(2),
    critical: new Decimal(3),
  };

  // Health factor score (worst case)
  const hfScore = healthFactors.length > 0
    ? Decimal.max(...healthFactors.map((hf) => riskValue[hf.riskLevel]))
    : new Decimal(0);

  // Concentration score (worst case)
  const concScore = concentrationRisks.length > 0
    ? Decimal.max(...concentrationRisks.map((c) => riskValue[c.riskLevel]))
    : new Decimal(0);

  // IL score (worst case)
  const ilScore = ilEstimates.length > 0
    ? Decimal.max(...ilEstimates.map((il) => riskValue[il.riskLevel]))
    : new Decimal(0);

  // Diversity score: <3 positions = high risk, 3-5 = medium, >5 = low
  const divScore = positionCount < 3 ? new Decimal(2) : positionCount <= 5 ? new Decimal(1) : new Decimal(0);

  const weighted = hfScore.mul("0.4").add(concScore.mul("0.3")).add(ilScore.mul("0.2")).add(divScore.mul("0.1"));

  if (weighted.gte("2.5")) return "critical";
  if (weighted.gte("1.5")) return "high";
  if (weighted.gte("0.5")) return "medium";
  return "low";
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

export async function analyzePortfolio(
  walletAddress: string,
  positions: NormalizedPosition[]
): Promise<PortfolioRiskAssessment> {
  const totalValueUsd = positions.reduce(
    (sum, p) => sum.add(p.valueUsd),
    new Decimal(0)
  );

  // Fetch external data (with graceful degradation)
  const pools = await fetchAllPools() ?? [];

  const [healthFactors, concentrationRisks, ilEstimates] = await Promise.all([
    analyzeHealthFactors(walletAddress),
    Promise.resolve(analyzeConcentration(positions)),
    Promise.resolve(estimateImpermanentLoss(positions)),
  ]);

  const idleAssets = detectIdleAssets(positions, pools);
  const rateArbitrages = detectRateArbitrages(positions, pools);

  const overallRisk = calculateOverallRisk(
    healthFactors,
    concentrationRisks,
    ilEstimates,
    positions.length
  );

  return {
    walletAddress,
    totalValueUsd,
    positionCount: positions.length,
    positions,
    healthFactors,
    concentrationRisks,
    impermanentLossEstimates: ilEstimates,
    idleAssets,
    rateArbitrages,
    overallRisk,
    analyzedAt: new Date(),
  };
}
