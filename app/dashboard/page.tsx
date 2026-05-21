"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PortfolioReport } from "@/components/PortfolioReport";
import { ChatInterface } from "@/components/ChatInterface";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { useWalletSession } from "@/lib/auth/use-wallet-session";
import type {
  SerializedPortfolioRiskAssessment,
  Suggestion,
} from "@/lib/defi/types";
import { AVAILABLE_PROVIDERS, type LLMProvider } from "@/lib/llm/types";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get("address");
  const { isVerified, isVerifying, signIn, address: walletAddress } =
    useWalletSession();

  const [report, setReport] = useState<string | null>(null);
  const [assessment, setAssessment] =
    useState<SerializedPortfolioRiskAssessment | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<LLMProvider>("anthropic");

  useEffect(() => {
    const stored = localStorage.getItem("lucid_provider") as LLMProvider | null;
    if (stored && AVAILABLE_PROVIDERS.includes(stored)) setProvider(stored);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!address || !isVerified) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, provider }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || `Failed to analyze portfolio (${res.status})`
        );
      }

      setReport(data.report);
      setAssessment(data.assessment);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [address, isVerified, provider]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    if (!address) router.push("/");
  }, [address, router]);

  if (!address) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#26221C] px-4 py-3">
        <h1 className="text-sm font-semibold text-[#EFE9D8]">
          <span className="text-[#D9FF4A]">Lucid</span>
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815] text-xs"
          >
            Analyze another
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings")}
            className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815] text-xs"
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Not verified: require connect + signature before analyzing */}
      {!isVerified ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4 text-center">
          <p className="text-sm text-[#C9C2B0]">
            Connect your wallet and verify ownership to analyze. Your encrypted
            API key is tied to your wallet — only you can use it.
          </p>
          <ConnectButton />
          {walletAddress && (
            <Button
              onClick={signIn}
              disabled={isVerifying}
              className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80 font-medium"
            >
              {isVerifying ? "Waiting for signature..." : "Verify ownership"}
            </Button>
          )}
        </div>
      ) : error && !isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
          <p className="text-sm text-[#FF7A6E]">{error}</p>
          <div className="flex gap-2">
            <Button
              onClick={fetchPortfolio}
              className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80"
            >
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/settings")}
              className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815]"
            >
              Settings
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: side-by-side */}
          <div className="hidden md:flex flex-1 min-h-0">
            <div className="w-[60%] border-r border-[#26221C] overflow-y-auto p-6">
              <PortfolioReport
                report={report}
                assessment={assessment}
                isLoading={isLoading}
              />
              {!isLoading && suggestions.length > 0 && (
                <div className="mt-8">
                  <SuggestionsPanel suggestions={suggestions} />
                </div>
              )}
            </div>
            <div className="w-[40%] flex flex-col min-h-0">
              <ChatInterface
                walletAddress={address}
                portfolioContext={assessment}
                provider={provider}
                onNavigateToSettings={() => router.push("/settings")}
              />
            </div>
          </div>

          {/* Mobile: tabs */}
          <div className="md:hidden flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="report" className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-[#131210] border-b border-[#26221C] rounded-none w-full justify-start px-4">
                <TabsTrigger
                  value="report"
                  className="text-xs data-[state=active]:bg-[#D9FF4A] data-[state=active]:text-[#0B0A08]"
                >
                  Report
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="text-xs data-[state=active]:bg-[#D9FF4A] data-[state=active]:text-[#0B0A08]"
                >
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="suggestions"
                  className="text-xs data-[state=active]:bg-[#D9FF4A] data-[state=active]:text-[#0B0A08]"
                >
                  Suggestions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="flex-1 overflow-y-auto p-4 mt-0">
                <PortfolioReport
                  report={report}
                  assessment={assessment}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
                <ChatInterface
                  walletAddress={address}
                  portfolioContext={assessment}
                  provider={provider}
                  onNavigateToSettings={() => router.push("/settings")}
                />
              </TabsContent>

              <TabsContent value="suggestions" className="flex-1 overflow-y-auto p-4 mt-0">
                <SuggestionsPanel suggestions={suggestions} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
