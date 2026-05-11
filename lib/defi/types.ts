import Decimal from "decimal.js";

// ─── Zerion API Response Types ───────────────────────────────────────────────

export interface ZerionFungibleInfo {
  name: string;
  symbol: string;
  icon: { url: string } | null;
  implementations: Array<{
    chain_id: string;
    address: string | null;
    decimals: number;
  }>;
}

export interface ZerionPosition {
  type: string;
  id: string;
  attributes: {
    parent: string | null;
    protocol: string | null;
    name: string;
    position_type: "wallet" | "deposit" | "staked" | "reward" | "borrow" | "locked" | "airdrop" | "loan";
    quantity: {
      int: string;
      decimals: number;
      float: number;
      numeric: string;
    };
    value: number | null;
    price: number;
    changes: {
      absolute_1d: number | null;
      percent_1d: number | null;
    } | null;
    fungible_info: ZerionFungibleInfo;
  };
}

export interface ZerionPortfolioResponse {
  links: { self: string; next?: string };
  data: ZerionPosition[];
}

// ─── DeFiLlama Types ─────────────────────────────────────────────────────────

export interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  pool: string;
  stablecoin: boolean;
  ilRisk: string;
  underlyingTokens: string[] | null;
}

// ─── Aave Types ──────────────────────────────────────────────────────────────

export interface AaveUserReserve {
  underlyingAsset: string;
  symbol: string;
  scaledATokenBalance: string;
  scaledVariableDebt: string;
  stableBorrowRate: string;
  variableBorrowRate: string;
  liquidityRate: string;
  usageAsCollateralEnabled: boolean;
}

export interface AaveUserSummary {
  totalLiquidityUSD: string;
  totalCollateralUSD: string;
  totalBorrowsUSD: string;
  availableBorrowsUSD: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  reserves: AaveUserReserve[];
}

// ─── Domain Model ────────────────────────────────────────────────────────────

export type PositionCategory =
  | "lending_supply"
  | "lending_borrow"
  | "liquidity_pool"
  | "staking"
  | "wallet"
  | "reward"
  | "locked"
  | "other";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface NormalizedPosition {
  id: string;
  protocol: string | null;
  name: string;
  symbol: string;
  category: PositionCategory;
  valueUsd: Decimal;
  quantity: Decimal;
  price: Decimal;
  change24hPercent: Decimal | null;
  change24hUsd: Decimal | null;
  iconUrl: string | null;
  contractAddress: string | null;
  chain: string;
}

// ─── Risk Assessment Types ───────────────────────────────────────────────────

export interface HealthFactorAssessment {
  protocol: string;
  healthFactor: Decimal;
  riskLevel: RiskLevel;
  totalCollateralUsd: Decimal;
  totalBorrowedUsd: Decimal;
  liquidationThreshold: Decimal;
  availableToBorrowUsd: Decimal;
}

export interface ConcentrationRisk {
  asset: string;
  symbol: string;
  allocationPercent: Decimal;
  valueUsd: Decimal;
  riskLevel: RiskLevel;
}

export interface ImpermanentLossEstimate {
  protocol: string;
  pool: string;
  token0: string;
  token1: string;
  estimatedLossPercent: Decimal;
  estimatedLossUsd: Decimal;
  riskLevel: RiskLevel;
}

export interface IdleAsset {
  symbol: string;
  valueUsd: Decimal;
  currentApy: Decimal;
  bestAvailableApy: Decimal;
  bestProtocol: string;
  potentialAnnualGainUsd: Decimal;
}

export interface RateArbitrage {
  symbol: string;
  currentProtocol: string;
  currentApy: Decimal;
  bestProtocol: string;
  bestApy: Decimal;
  differentialBps: Decimal;
  potentialAnnualGainUsd: Decimal;
  valueUsd: Decimal;
}

export interface PortfolioRiskAssessment {
  walletAddress: string;
  totalValueUsd: Decimal;
  positionCount: number;
  positions: NormalizedPosition[];
  healthFactors: HealthFactorAssessment[];
  concentrationRisks: ConcentrationRisk[];
  impermanentLossEstimates: ImpermanentLossEstimate[];
  idleAssets: IdleAsset[];
  rateArbitrages: RateArbitrage[];
  overallRisk: RiskLevel;
  analyzedAt: Date;
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export type SuggestionCategory =
  | "health_factor"
  | "concentration"
  | "impermanent_loss"
  | "idle_asset"
  | "rate_arbitrage";

export type SuggestionPriority = "low" | "medium" | "high" | "critical";

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  currentValue: string;
  suggestedAction: string;
  potentialImpact: string;
  relatedProtocol: string | null;
  relatedAsset: string | null;
}

// ─── Portfolio Report ────────────────────────────────────────────────────────

export interface PortfolioReport {
  report: string;
  assessment: PortfolioRiskAssessment;
  suggestions: Suggestion[];
  generatedAt: Date;
}

// ─── API Request/Response Types ──────────────────────────────────────────────

export interface PortfolioRequest {
  walletAddress: string;
  provider?: "anthropic" | "openai";
}

export interface PortfolioResponse {
  report: string;
  assessment: SerializedPortfolioRiskAssessment;
  suggestions: Suggestion[];
}

export interface ChatRequest {
  message: string;
  walletAddress: string;
  provider?: "anthropic" | "openai";
}

// ─── Serialization ───────────────────────────────────────────────────────────
// Decimal values must be serialized to strings for JSON transport.

export interface SerializedNormalizedPosition
  extends Omit<
    NormalizedPosition,
    "valueUsd" | "quantity" | "price" | "change24hPercent" | "change24hUsd"
  > {
  valueUsd: string;
  quantity: string;
  price: string;
  change24hPercent: string | null;
  change24hUsd: string | null;
}

export interface SerializedPortfolioRiskAssessment {
  walletAddress: string;
  totalValueUsd: string;
  positionCount: number;
  positions: SerializedNormalizedPosition[];
  healthFactors: Array<
    Omit<
      HealthFactorAssessment,
      | "healthFactor"
      | "totalCollateralUsd"
      | "totalBorrowedUsd"
      | "liquidationThreshold"
      | "availableToBorrowUsd"
    > & {
      healthFactor: string;
      totalCollateralUsd: string;
      totalBorrowedUsd: string;
      liquidationThreshold: string;
      availableToBorrowUsd: string;
    }
  >;
  concentrationRisks: Array<
    Omit<ConcentrationRisk, "allocationPercent" | "valueUsd"> & {
      allocationPercent: string;
      valueUsd: string;
    }
  >;
  impermanentLossEstimates: Array<
    Omit<
      ImpermanentLossEstimate,
      "estimatedLossPercent" | "estimatedLossUsd"
    > & {
      estimatedLossPercent: string;
      estimatedLossUsd: string;
    }
  >;
  idleAssets: Array<
    Omit<
      IdleAsset,
      "valueUsd" | "currentApy" | "bestAvailableApy" | "potentialAnnualGainUsd"
    > & {
      valueUsd: string;
      currentApy: string;
      bestAvailableApy: string;
      potentialAnnualGainUsd: string;
    }
  >;
  rateArbitrages: Array<
    Omit<
      RateArbitrage,
      | "currentApy"
      | "bestApy"
      | "differentialBps"
      | "potentialAnnualGainUsd"
      | "valueUsd"
    > & {
      currentApy: string;
      bestApy: string;
      differentialBps: string;
      potentialAnnualGainUsd: string;
      valueUsd: string;
    }
  >;
  overallRisk: RiskLevel;
  analyzedAt: string;
}
