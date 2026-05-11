import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod/v4";
import { isAddress } from "viem";
import { generateText } from "ai";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { resolveApiKey } from "@/lib/billing/keys";
import { checkLimit, incrementUsage } from "@/lib/billing/usage";
import { getWalletPortfolio } from "@/lib/defi/zerion";
import { analyzePortfolio } from "@/lib/defi/risk-engine";
import { generateSuggestions } from "@/lib/defi/suggestions";
import { getModel } from "@/lib/llm/provider";
import { buildReportSystemPrompt, buildReportUserPrompt } from "@/lib/llm/prompts";
import { serializeAssessment } from "@/lib/defi/serialize";
import type { LLMProvider } from "@/lib/llm/types";

const portfolioSchema = z.object({
  walletAddress: z.string().refine((val) => isAddress(val), {
    message: "Invalid Ethereum address",
  }),
  provider: z.enum(["anthropic", "openai"]).optional(),
});

export async function POST(request: NextRequest) {
  // Parse request
  const body = await request.json();
  const parsed = portfolioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { walletAddress, provider } = parsed.data;

  // Auth check
  const supabase = await createServerSupabaseClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve API key
  const llmProvider = provider || "anthropic";
  const resolved = await resolveApiKey(user.id, llmProvider);

  // Check limits for platform key users
  if (resolved.source === "platform") {
    const limit = await checkLimit(user.id, "reports");
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Daily report limit reached",
          upgrade: true,
          remaining: limit.remaining,
          limit: limit.limit,
        },
        { status: 429 }
      );
    }
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
    const model = getModel(llmProvider as LLMProvider, resolved.apiKey);
    const { text: report } = await generateText({
      model,
      system: buildReportSystemPrompt(),
      prompt: buildReportUserPrompt(assessment, walletAddress),
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    // Track usage for platform key users
    if (resolved.source === "platform") {
      await incrementUsage(user.id, "reports");
    }

    return NextResponse.json({
      report,
      assessment: serializeAssessment(assessment),
      suggestions,
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);

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
