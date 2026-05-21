import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { isAddress } from "viem";
import { generateText } from "ai";
import { getSessionAddress } from "@/lib/auth/session";
import { resolveApiKey, MissingApiKeyError } from "@/lib/billing/keys";
import { isProviderAllowed } from "@/lib/llm/types";
import { getWalletPortfolio } from "@/lib/defi/zerion";
import { analyzePortfolio } from "@/lib/defi/risk-engine";
import { generateSuggestions } from "@/lib/defi/suggestions";
import { getModel } from "@/lib/llm/provider";
import { buildReportSystemPrompt, buildReportUserPrompt } from "@/lib/llm/prompts";
import { serializeAssessment } from "@/lib/defi/serialize";


const portfolioSchema = z.object({
  walletAddress: z.string().refine((val) => isAddress(val), {
    message: "Invalid Ethereum address",
  }),
  provider: z.enum(["anthropic", "openai", "local"]).optional(),
});

export async function POST(request: NextRequest) {
  // Parse request
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = portfolioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { walletAddress, provider } = parsed.data;

  // The verified wallet owns the API key (analysis target may be any address).
  const sessionAddress = getSessionAddress(request);
  if (!sessionAddress) {
    return NextResponse.json(
      { error: "Connect your wallet and verify ownership to analyze." },
      { status: 401 }
    );
  }

  // Resolve the wallet's own (BYOK) key — no platform key, no usage limits.
  const llmProvider = provider || "anthropic";
  if (!isProviderAllowed(llmProvider)) {
    return NextResponse.json(
      { error: "The local model is only available in development. Use an Anthropic or OpenAI key." },
      { status: 400 }
    );
  }
  let apiKey: string;
  try {
    apiKey = await resolveApiKey(sessionAddress, llmProvider);
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    // Any other failure (e.g. DB/schema) → clean JSON so the client can show it.
    console.error("resolveApiKey error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not read your saved API key. Try again shortly." },
      { status: 500 }
    );
  }

  try {
    // Fetch positions
    const positions = await getWalletPortfolio(walletAddress);
    if (positions.length === 0) {
      return NextResponse.json({
        report: "No DeFi positions found for this wallet address.",
        assessment: null,
        suggestions: [],
      });
    }

    // Analyze portfolio
    const assessment = await analyzePortfolio(walletAddress, positions);
    const suggestions = generateSuggestions(assessment);

    // Generate report via LLM
    const model = getModel(llmProvider, apiKey);
    const { text: report } = await generateText({
      model,
      system: buildReportSystemPrompt(),
      prompt: buildReportUserPrompt(assessment, walletAddress),
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({
      report,
      assessment: serializeAssessment(assessment),
      suggestions,
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error) {
      if (error.message.includes("Zerion API")) {
        return NextResponse.json(
          { error: "Failed to fetch wallet data. Please try again." },
          { status: 502 }
        );
      }
      if (error.message.includes("Invalid API key") || error.message.includes("401")) {
        return NextResponse.json(
          { error: "Your API key is invalid or expired. Check your settings." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
