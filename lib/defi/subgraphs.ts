import Decimal from "decimal.js";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import type { AaveUserSummary, HealthFactorAssessment } from "@/lib/defi/types";
import type { RiskLevel } from "@/lib/defi/types";

// Aave V3 Ethereum mainnet addresses
const AAVE_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e" as const;
const AAVE_UI_POOL_DATA_PROVIDER = "0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d" as const;

function getRpcClient() {
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) throw new Error("ETHEREUM_RPC_URL environment variable is not set");

  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
}

// Minimal ABI for UiPoolDataProvider
const uiPoolDataProviderAbi = [
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getReservesData",
    outputs: [
      { name: "", type: "tuple[]", components: [
        { name: "underlyingAsset", type: "address" },
        { name: "name", type: "string" },
        { name: "symbol", type: "string" },
        { name: "decimals", type: "uint256" },
        { name: "baseLTVasCollateral", type: "uint256" },
        { name: "reserveLiquidationThreshold", type: "uint256" },
        { name: "reserveFactor", type: "uint256" },
        { name: "usageAsCollateralEnabled", type: "bool" },
        { name: "borrowingEnabled", type: "bool" },
        { name: "isActive", type: "bool" },
        { name: "isFrozen", type: "bool" },
        { name: "liquidityIndex", type: "uint128" },
        { name: "variableBorrowIndex", type: "uint128" },
        { name: "liquidityRate", type: "uint128" },
        { name: "variableBorrowRate", type: "uint128" },
        { name: "lastUpdateTimestamp", type: "uint40" },
        { name: "aTokenAddress", type: "address" },
        { name: "variableDebtTokenAddress", type: "address" },
        { name: "interestRateStrategyAddress", type: "address" },
        { name: "availableLiquidity", type: "uint256" },
        { name: "totalScaledVariableDebt", type: "uint256" },
        { name: "priceInMarketReferenceCurrency", type: "uint256" },
        { name: "variableRateSlope1", type: "uint256" },
        { name: "variableRateSlope2", type: "uint256" },
        { name: "stableRateSlope1", type: "uint256" },
        { name: "stableRateSlope2", type: "uint256" },
        { name: "baseVariableBorrowRate", type: "uint256" },
        { name: "optimalUsageRatio", type: "uint256" },
        { name: "isPaused", type: "bool" },
        { name: "isSiloedBorrowing", type: "bool" },
        { name: "accruedToTreasury", type: "uint128" },
        { name: "unbacked", type: "uint128" },
        { name: "isolationModeTotalDebt", type: "uint128" },
        { name: "debtCeiling", type: "uint256" },
        { name: "debtCeilingDecimals", type: "uint256" },
        { name: "eModeCategoryId", type: "uint8" },
        { name: "borrowCap", type: "uint256" },
        { name: "supplyCap", type: "uint256" },
        { name: "eModeLtv", type: "uint16" },
        { name: "eModeLiquidationThreshold", type: "uint16" },
        { name: "eModeLiquidationBonus", type: "uint16" },
        { name: "eModeLabel", type: "string" },
        { name: "borrowableInIsolation", type: "bool" },
      ]},
      { name: "", type: "tuple", components: [
        { name: "marketReferenceCurrencyUnit", type: "uint256" },
        { name: "marketReferenceCurrencyPriceInUsd", type: "int256" },
        { name: "networkBaseTokenPriceInUsd", type: "int256" },
        { name: "networkBaseTokenPriceDecimals", type: "uint8" },
      ]},
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "provider", type: "address" },
      { name: "user", type: "address" },
    ],
    name: "getUserReservesData",
    outputs: [
      { name: "", type: "tuple[]", components: [
        { name: "underlyingAsset", type: "address" },
        { name: "scaledATokenBalance", type: "uint256" },
        { name: "usageAsCollateralEnabledOnUser", type: "bool" },
        { name: "scaledVariableDebt", type: "uint256" },
      ]},
      { name: "", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function assessHealthFactorRisk(healthFactor: Decimal): RiskLevel {
  if (healthFactor.lte(1)) return "critical";
  if (healthFactor.lt(1.5)) return "high";
  if (healthFactor.lte(2)) return "medium";
  return "low";
}

export async function fetchAaveUserData(
  address: string
): Promise<AaveUserSummary | null> {
  try {
    const client = getRpcClient();

    // Fetch user reserves data
    const [userReserves] = await client.readContract({
      address: AAVE_UI_POOL_DATA_PROVIDER,
      abi: uiPoolDataProviderAbi,
      functionName: "getUserReservesData",
      args: [AAVE_POOL_ADDRESSES_PROVIDER as Address, address as Address],
    });

    // Filter to reserves where user has supply or debt
    const activeReserves = (userReserves as readonly unknown[]).filter((r: unknown) => {
      const reserve = r as { scaledATokenBalance: bigint; scaledVariableDebt: bigint };
      return reserve.scaledATokenBalance > BigInt(0) || reserve.scaledVariableDebt > BigInt(0);
    });

    if (activeReserves.length === 0) return null;

    // Fetch reserves data for price/config info
    const [reservesData, baseCurrencyInfo] = await client.readContract({
      address: AAVE_UI_POOL_DATA_PROVIDER,
      abi: uiPoolDataProviderAbi,
      functionName: "getReservesData",
      args: [AAVE_POOL_ADDRESSES_PROVIDER as Address],
    });

    // Build reserve lookup
    const reserveMap = new Map<string, Record<string, unknown>>();
    for (const r of reservesData as readonly Record<string, unknown>[]) {
      reserveMap.set((r.underlyingAsset as string).toLowerCase(), r);
    }

    const baseCurrency = baseCurrencyInfo as {
      marketReferenceCurrencyUnit: bigint;
      marketReferenceCurrencyPriceInUsd: bigint;
    };
    const refUnit = new Decimal(baseCurrency.marketReferenceCurrencyUnit.toString());
    const refPriceUsd = new Decimal(baseCurrency.marketReferenceCurrencyPriceInUsd.toString()).div(1e8);

    // Calculate health factor manually
    let totalCollateralRef = new Decimal(0);
    let totalBorrowsRef = new Decimal(0);
    let weightedLiqThreshold = new Decimal(0);

    for (const userRes of activeReserves as readonly Record<string, unknown>[]) {
      const asset = (userRes.underlyingAsset as string).toLowerCase();
      const reserveInfo = reserveMap.get(asset);
      if (!reserveInfo) continue;

      const price = new Decimal((reserveInfo.priceInMarketReferenceCurrency as bigint).toString());
      const decimals = Number(reserveInfo.decimals as bigint);
      const liqThreshold = new Decimal((reserveInfo.reserveLiquidationThreshold as bigint).toString()).div(10000);
      const liquidityIndex = new Decimal((reserveInfo.liquidityIndex as bigint).toString()).div(new Decimal(10).pow(27));
      const variableBorrowIndex = new Decimal((reserveInfo.variableBorrowIndex as bigint).toString()).div(new Decimal(10).pow(27));

      const scaledBalance = new Decimal((userRes.scaledATokenBalance as bigint).toString());
      const scaledDebt = new Decimal((userRes.scaledVariableDebt as bigint).toString());

      const balanceInRef = scaledBalance.mul(liquidityIndex).mul(price).div(new Decimal(10).pow(decimals)).div(refUnit);
      const debtInRef = scaledDebt.mul(variableBorrowIndex).mul(price).div(new Decimal(10).pow(decimals)).div(refUnit);

      if ((userRes.usageAsCollateralEnabledOnUser as boolean) && balanceInRef.gt(0)) {
        totalCollateralRef = totalCollateralRef.add(balanceInRef);
        weightedLiqThreshold = weightedLiqThreshold.add(balanceInRef.mul(liqThreshold));
      }
      totalBorrowsRef = totalBorrowsRef.add(debtInRef);
    }

    const avgLiqThreshold = totalCollateralRef.gt(0)
      ? weightedLiqThreshold.div(totalCollateralRef)
      : new Decimal(0);

    const healthFactor = totalBorrowsRef.gt(0)
      ? totalCollateralRef.mul(avgLiqThreshold).div(totalBorrowsRef)
      : new Decimal("999");

    return {
      totalLiquidityUSD: totalCollateralRef.mul(refPriceUsd).toFixed(2),
      totalCollateralUSD: totalCollateralRef.mul(refPriceUsd).toFixed(2),
      totalBorrowsUSD: totalBorrowsRef.mul(refPriceUsd).toFixed(2),
      availableBorrowsUSD: "0",
      currentLiquidationThreshold: avgLiqThreshold.toFixed(4),
      ltv: "0",
      healthFactor: healthFactor.toFixed(4),
      reserves: [],
    };
  } catch (error) {
    console.error("Failed to fetch Aave user data:", error);
    return null;
  }
}

// Compound V3 Comet addresses (Ethereum mainnet)
const COMPOUND_COMETS = [
  { name: "USDC", address: "0xc3d688B66703497DAA19211EEdff47f25384cdc3" as const },
  { name: "ETH", address: "0xA17581A9E3356d9A858b789D68B4d866e593aE94" as const },
] as const;

// Minimal Comet ABI for borrowing info
const cometAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "borrowBalanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "collateralBalanceOf",
    outputs: [{ name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "priceFeed", type: "address" }],
    name: "getPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "isLiquidatable",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function fetchCompoundUserData(
  address: string
): Promise<HealthFactorAssessment[]> {
  const assessments: HealthFactorAssessment[] = [];

  try {
    const client = getRpcClient();

    for (const comet of COMPOUND_COMETS) {
      const borrowBalance = await client.readContract({
        address: comet.address,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [address as Address],
      });

      // Skip if no borrows
      if (borrowBalance === BigInt(0)) continue;

      const isLiquidatable = await client.readContract({
        address: comet.address,
        abi: cometAbi,
        functionName: "isLiquidatable",
        args: [address as Address],
      });

      // Compound V3 doesn't expose a numeric health factor like Aave,
      // so we approximate: liquidatable = critical, else estimate based on borrow size
      const borrowUsd = new Decimal(borrowBalance.toString()).div(
        comet.name === "USDC" ? 1e6 : 1e18
      );

      const hf = isLiquidatable ? new Decimal("0.95") : new Decimal("2.5");

      assessments.push({
        protocol: `Compound V3 (${comet.name})`,
        healthFactor: hf,
        riskLevel: assessHealthFactorRisk(hf),
        totalCollateralUsd: new Decimal(0), // Would need oracle calls to compute
        totalBorrowedUsd: borrowUsd,
        liquidationThreshold: new Decimal("0.83"),
        availableToBorrowUsd: new Decimal(0),
      });
    }
  } catch (error) {
    console.error("Failed to fetch Compound V3 data:", error);
  }

  return assessments;
}

export async function fetchProtocolHealthData(
  address: string
): Promise<HealthFactorAssessment[]> {
  const assessments: HealthFactorAssessment[] = [];

  // Fetch Aave V3 and Compound V3 in parallel
  const [aaveData, compoundAssessments] = await Promise.all([
    fetchAaveUserData(address),
    fetchCompoundUserData(address),
  ]);

  if (aaveData && new Decimal(aaveData.totalBorrowsUSD).gt(0)) {
    const hf = new Decimal(aaveData.healthFactor);
    assessments.push({
      protocol: "Aave V3",
      healthFactor: hf,
      riskLevel: assessHealthFactorRisk(hf),
      totalCollateralUsd: new Decimal(aaveData.totalCollateralUSD),
      totalBorrowedUsd: new Decimal(aaveData.totalBorrowsUSD),
      liquidationThreshold: new Decimal(aaveData.currentLiquidationThreshold),
      availableToBorrowUsd: new Decimal(aaveData.availableBorrowsUSD),
    });
  }

  assessments.push(...compoundAssessments);

  return assessments;
}
