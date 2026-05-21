import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { isAddress } from "viem";
import { streamText, type ModelMessage } from "ai";
import { getSessionAddress } from "@/lib/auth/session";
import { resolveApiKey, MissingApiKeyError } from "@/lib/billing/keys";
import { getModel } from "@/lib/llm/provider";
import { isProviderAllowed } from "@/lib/llm/types";
import { buildChatSystemPrompt } from "@/lib/llm/prompts";
import type { PortfolioRiskAssessment } from "@/lib/defi/types";

import Decimal from "decimal.js";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  walletAddress: z.string().refine((val) => isAddress(val), {
    message: "Invalid Ethereum address",
  }),
  portfolioContext: z.record(z.string(), z.unknown()).optional(),
  provider: z.enum(["anthropic", "openai", "local"]).optional(),
});

// Rehydrate Decimal values from serialized assessment
function rehydrateAssessment(data: Record<string, unknown>): PortfolioRiskAssessment {
  return {
    ...data,
    totalValueUsd: new Decimal((data.totalValueUsd as string) || "0"),
    positions: ((data.positions as Record<string, unknown>[]) || []).map((p) => ({
      ...p,
      valueUsd: new Decimal((p.valueUsd as string) || "0"),
      quantity: new Decimal((p.quantity as string) || "0"),
      price: new Decimal((p.price as string) || "0"),
      change24hPercent: p.change24hPercent ? new Decimal(p.change24hPercent as string) : null,
      change24hUsd: p.change24hUsd ? new Decimal(p.change24hUsd as string) : null,
    })),
    healthFactors: ((data.healthFactors as Record<string, unknown>[]) || []).map((hf) => ({
      ...hf,
      healthFactor: new Decimal((hf.healthFactor as string) || "0"),
      totalCollateralUsd: new Decimal((hf.totalCollateralUsd as string) || "0"),
      totalBorrowedUsd: new Decimal((hf.totalBorrowedUsd as string) || "0"),
      liquidationThreshold: new Decimal((hf.liquidationThreshold as string) || "0"),
      availableToBorrowUsd: new Decimal((hf.availableToBorrowUsd as string) || "0"),
    })),
    concentrationRisks: ((data.concentrationRisks as Record<string, unknown>[]) || []).map((cr) => ({
      ...cr,
      allocationPercent: new Decimal((cr.allocationPercent as string) || "0"),
      valueUsd: new Decimal((cr.valueUsd as string) || "0"),
    })),
    impermanentLossEstimates: ((data.impermanentLossEstimates as Record<string, unknown>[]) || []).map((il) => ({
      ...il,
      estimatedLossPercent: new Decimal((il.estimatedLossPercent as string) || "0"),
      estimatedLossUsd: new Decimal((il.estimatedLossUsd as string) || "0"),
    })),
    idleAssets: ((data.idleAssets as Record<string, unknown>[]) || []).map((idle) => ({
      ...idle,
      valueUsd: new Decimal((idle.valueUsd as string) || "0"),
      currentApy: new Decimal((idle.currentApy as string) || "0"),
      bestAvailableApy: new Decimal((idle.bestAvailableApy as string) || "0"),
      potentialAnnualGainUsd: new Decimal((idle.potentialAnnualGainUsd as string) || "0"),
    })),
    rateArbitrages: ((data.rateArbitrages as Record<string, unknown>[]) || []).map((arb) => ({
      ...arb,
      currentApy: new Decimal((arb.currentApy as string) || "0"),
      bestApy: new Decimal((arb.bestApy as string) || "0"),
      differentialBps: new Decimal((arb.differentialBps as string) || "0"),
      potentialAnnualGainUsd: new Decimal((arb.potentialAnnualGainUsd as string) || "0"),
      valueUsd: new Decimal((arb.valueUsd as string) || "0"),
    })),
    analyzedAt: new Date((data.analyzedAt as string) || Date.now()),
  } as PortfolioRiskAssessment;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  const { messages, walletAddress, portfolioContext, provider } = parsed.data;

  // The verified wallet owns the API key.
  const sessionAddress = getSessionAddress(request);
  if (!sessionAddress) {
    return new Response(
      JSON.stringify({ error: "Connect your wallet and verify ownership." }),
      { status: 401 }
    );
  }

  // Resolve the wallet's own (BYOK) key — no platform key, no usage limits.
  const llmProvider = provider || "anthropic";
  if (!isProviderAllowed(llmProvider)) {
    return new Response(
      JSON.stringify({ error: "The local model is only available in development." }),
      { status: 400 }
    );
  }
  let apiKey: string;
  try {
    apiKey = await resolveApiKey(sessionAddress, llmProvider);
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
    console.error("resolveApiKey error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "Could not read your saved API key." }),
      { status: 500 }
    );
  }

  // Build system prompt from portfolio context
  const assessment = portfolioContext
    ? rehydrateAssessment(portfolioContext as Record<string, unknown>)
    : null;

  const systemPrompt = assessment
    ? buildChatSystemPrompt(assessment, walletAddress)
    : "You are a DeFi portfolio assistant. No portfolio has been loaded yet. A wallet address can be analyzed to provide portfolio insights.";

  const model = getModel(llmProvider, apiKey);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages as ModelMessage[],
    temperature: 0.3,
    maxOutputTokens: 1024,
  });

  return result.toTextStreamResponse();
}
