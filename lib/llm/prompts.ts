import type { PortfolioRiskAssessment } from "@/lib/defi/types";
import { formatUsd, formatPercent, formatHealthFactor, truncateAddress } from "@/lib/utils/format";

export function buildReportSystemPrompt(): string {
  return `You are a DeFi portfolio analyst that translates complex DeFi positions into plain English.

RULES — follow these strictly:
1. NEVER compute, estimate, or invent any numbers. Only use the exact numbers provided in the data below.
2. NEVER give financial advice. Frame findings as "opportunities detected" or "risks identified", never "you should" or "I recommend".
3. EXPLAIN jargon on first use. For example: "health factor (a measure of how close your loan is to liquidation)".
4. Use the pre-computed risk levels and values exactly as provided.
5. Keep the tone professional but accessible — imagine explaining to someone smart but new to DeFi.
6. Structure the report with clear sections: Overview, Positions, Risks, and Opportunities.
7. Include a disclaimer at the end: "This report is for informational purposes only and does not constitute financial advice."

FORMAT:
- Use markdown headers and bullet points
- Bold key numbers and risk levels
- Keep paragraphs short (2-3 sentences max)`;
}

function serializeAssessmentForPrompt(
  assessment: PortfolioRiskAssessment,
  walletAddress: string
): string {
  const sections: string[] = [];

  sections.push(`WALLET: ${truncateAddress(walletAddress)}`);
  sections.push(`TOTAL VALUE: ${formatUsd(assessment.totalValueUsd)}`);
  sections.push(`POSITIONS: ${assessment.positionCount}`);
  sections.push(`OVERALL RISK: ${assessment.overallRisk.toUpperCase()}`);
  sections.push("");

  // Positions
  sections.push("POSITIONS:");
  for (const pos of assessment.positions) {
    const change = pos.change24hPercent
      ? ` (${formatPercent(pos.change24hPercent)} 24h)`
      : "";
    sections.push(
      `- ${pos.name} (${pos.symbol}): ${formatUsd(pos.valueUsd)}${change} [${pos.category}${pos.protocol ? ` on ${pos.protocol}` : ""}]`
    );
  }
  sections.push("");

  // Health factors
  if (assessment.healthFactors.length > 0) {
    sections.push("HEALTH FACTORS:");
    for (const hf of assessment.healthFactors) {
      sections.push(
        `- ${hf.protocol}: HF=${formatHealthFactor(hf.healthFactor)} (${hf.riskLevel}), Collateral=${formatUsd(hf.totalCollateralUsd)}, Borrowed=${formatUsd(hf.totalBorrowedUsd)}`
      );
    }
    sections.push("");
  }

  // Concentration
  if (assessment.concentrationRisks.length > 0) {
    sections.push("CONCENTRATION RISKS:");
    for (const cr of assessment.concentrationRisks) {
      sections.push(
        `- ${cr.symbol}: ${cr.allocationPercent.toFixed(1)}% of portfolio (${formatUsd(cr.valueUsd)}) — ${cr.riskLevel} risk`
      );
    }
    sections.push("");
  }

  // IL
  if (assessment.impermanentLossEstimates.length > 0) {
    sections.push("IMPERMANENT LOSS:");
    for (const il of assessment.impermanentLossEstimates) {
      sections.push(
        `- ${il.pool} on ${il.protocol}: ~${il.estimatedLossPercent.toFixed(2)}% IL (${formatUsd(il.estimatedLossUsd)}) — ${il.riskLevel} risk`
      );
    }
    sections.push("");
  }

  // Idle assets
  if (assessment.idleAssets.length > 0) {
    sections.push("IDLE ASSETS (earning 0%):");
    for (const idle of assessment.idleAssets) {
      sections.push(
        `- ${idle.symbol}: ${formatUsd(idle.valueUsd)} idle. Best: ${idle.bestProtocol} at ${formatPercent(idle.bestAvailableApy)} APY (~${formatUsd(idle.potentialAnnualGainUsd)}/yr)`
      );
    }
    sections.push("");
  }

  // Rate arbitrages
  if (assessment.rateArbitrages.length > 0) {
    sections.push("RATE OPPORTUNITIES:");
    for (const arb of assessment.rateArbitrages) {
      sections.push(
        `- ${arb.symbol}: ${arb.currentProtocol} ${formatPercent(arb.currentApy)} → ${arb.bestProtocol} ${formatPercent(arb.bestApy)} (+${arb.differentialBps.toFixed(0)}bps, ~${formatUsd(arb.potentialAnnualGainUsd)}/yr)`
      );
    }
  }

  return sections.join("\n");
}

export function buildReportUserPrompt(
  assessment: PortfolioRiskAssessment,
  walletAddress: string
): string {
  const data = serializeAssessmentForPrompt(assessment, walletAddress);

  return `Generate a plain English portfolio report for this DeFi wallet.

${data}

Write the report now. Remember: use ONLY the numbers above, explain all DeFi terms, and do not give financial advice.`;
}

export function buildChatSystemPrompt(
  assessment: PortfolioRiskAssessment,
  walletAddress: string
): string {
  const data = serializeAssessmentForPrompt(assessment, walletAddress);

  return `You are a DeFi portfolio assistant. The user is asking questions about their portfolio.

RULES:
1. ONLY reference data from the portfolio below. Never invent positions, values, or protocols.
2. NEVER give financial advice. Use "opportunity detected" not "you should".
3. EXPLAIN jargon when the user seems unfamiliar.
4. If asked about something not in the data, say "I don't have that information for this wallet."
5. Keep responses concise and conversational.
6. For follow-up calculations, use only the pre-computed values below.

PORTFOLIO DATA:
${data}

Respond to the user's questions about this portfolio.`;
}
