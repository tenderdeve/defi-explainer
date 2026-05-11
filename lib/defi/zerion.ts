import Decimal from "decimal.js";
import { isAddress } from "viem";
import type {
  ZerionPortfolioResponse,
  ZerionPosition,
  NormalizedPosition,
  PositionCategory,
} from "@/lib/defi/types";

const ZERION_BASE_URL = "https://api.zerion.io/v1";

function getZerionHeaders(): HeadersInit {
  const apiKey = process.env.ZERION_API_KEY;
  if (!apiKey) throw new Error("ZERION_API_KEY environment variable is not set");

  return {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
  };
}

export function validateAddress(address: string): boolean {
  return isAddress(address);
}

export async function fetchWalletPositions(
  address: string
): Promise<ZerionPosition[]> {
  if (!validateAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }

  const allPositions: ZerionPosition[] = [];
  let url: string | undefined =
    `${ZERION_BASE_URL}/wallets/${address}/positions/?filter[position_types]=wallet,deposit,staked,reward,borrow,locked&currency=usd&sort=value`;

  while (url) {
    const response = await fetch(url, {
      headers: getZerionHeaders(),
      next: { revalidate: 60 },
    });

    if (response.status === 401) {
      throw new Error("Zerion API: Invalid API key");
    }
    if (response.status === 404) {
      return [];
    }
    if (response.status === 429) {
      throw new Error("Zerion API: Rate limit exceeded. Try again later.");
    }
    if (!response.ok) {
      throw new Error(`Zerion API: HTTP ${response.status}`);
    }

    const data: ZerionPortfolioResponse = await response.json();
    allPositions.push(...data.data);
    url = data.links.next;
  }

  return allPositions;
}

function mapPositionCategory(
  positionType: ZerionPosition["attributes"]["position_type"]
): PositionCategory {
  switch (positionType) {
    case "deposit":
      return "lending_supply";
    case "borrow":
    case "loan":
      return "lending_borrow";
    case "staked":
      return "staking";
    case "locked":
      return "locked";
    case "reward":
    case "airdrop":
      return "reward";
    case "wallet":
      return "wallet";
    default:
      return "other";
  }
}

export function normalizePositions(
  raw: ZerionPosition[]
): NormalizedPosition[] {
  return raw.map((pos) => {
    const attr = pos.attributes;
    const impl = attr.fungible_info.implementations?.[0];

    return {
      id: pos.id,
      protocol: attr.protocol,
      name: attr.fungible_info.name,
      symbol: attr.fungible_info.symbol,
      category: mapPositionCategory(attr.position_type),
      valueUsd: new Decimal(attr.value ?? 0),
      quantity: new Decimal(attr.quantity.numeric),
      price: new Decimal(attr.price),
      change24hPercent: attr.changes?.percent_1d != null
        ? new Decimal(attr.changes.percent_1d)
        : null,
      change24hUsd: attr.changes?.absolute_1d != null
        ? new Decimal(attr.changes.absolute_1d)
        : null,
      iconUrl: attr.fungible_info.icon?.url ?? null,
      contractAddress: impl?.address ?? null,
      chain: impl?.chain_id ?? "ethereum",
    };
  });
}

export async function getWalletPortfolio(
  address: string
): Promise<NormalizedPosition[]> {
  const raw = await fetchWalletPositions(address);
  return normalizePositions(raw);
}
