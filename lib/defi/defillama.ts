import Decimal from "decimal.js";
import type { DefiLlamaPool } from "@/lib/defi/types";

const POOLS_URL = "https://yields.llama.fi/pools";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_TVL = 1_000_000; // $1M minimum TVL for yield recommendations

let poolsCache: { data: DefiLlamaPool[]; timestamp: number } | null = null;

export async function fetchAllPools(): Promise<DefiLlamaPool[]> {
  // Return cached if fresh
  if (poolsCache && Date.now() - poolsCache.timestamp < CACHE_TTL_MS) {
    return poolsCache.data;
  }

  const response = await fetch(POOLS_URL);
  if (!response.ok) {
    throw new Error(`DeFiLlama API: HTTP ${response.status}`);
  }

  const json = await response.json();
  const pools: DefiLlamaPool[] = (json.data as DefiLlamaPool[]).filter(
    (pool) => pool.chain === "Ethereum"
  );

  poolsCache = { data: pools, timestamp: Date.now() };
  return pools;
}

export function findBestYieldForToken(
  symbol: string,
  pools: DefiLlamaPool[]
): { pool: DefiLlamaPool; apy: Decimal } | null {
  const normalizedSymbol = symbol.toUpperCase();

  const matches = pools
    .filter(
      (pool) =>
        pool.symbol.toUpperCase().includes(normalizedSymbol) &&
        pool.tvlUsd >= MIN_TVL &&
        pool.apy > 0
    )
    .sort((a, b) => b.apy - a.apy);

  if (matches.length === 0) return null;

  return {
    pool: matches[0],
    apy: new Decimal(matches[0].apy),
  };
}

export function findPoolForProtocolToken(
  protocol: string,
  symbol: string,
  pools: DefiLlamaPool[]
): DefiLlamaPool | null {
  const normalizedProtocol = protocol.toLowerCase();
  const normalizedSymbol = symbol.toUpperCase();

  return (
    pools.find(
      (pool) =>
        pool.project.toLowerCase().includes(normalizedProtocol) &&
        pool.symbol.toUpperCase().includes(normalizedSymbol) &&
        pool.tvlUsd >= MIN_TVL
    ) ?? null
  );
}

export interface YieldComparison {
  currentProtocol: string;
  currentApy: Decimal;
  bestProtocol: string;
  bestApy: Decimal;
  differentialBps: Decimal;
}

export function getYieldComparison(
  currentProtocol: string,
  symbol: string,
  pools: DefiLlamaPool[]
): YieldComparison | null {
  const currentPool = findPoolForProtocolToken(currentProtocol, symbol, pools);
  const best = findBestYieldForToken(symbol, pools);

  if (!best) return null;

  const currentApy = currentPool ? new Decimal(currentPool.apy) : new Decimal(0);
  const bestApy = best.apy;
  const differentialBps = bestApy.sub(currentApy).mul(100);

  return {
    currentProtocol: currentPool?.project ?? currentProtocol,
    currentApy,
    bestProtocol: best.pool.project,
    bestApy,
    differentialBps,
  };
}
