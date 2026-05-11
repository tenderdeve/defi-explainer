"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PortfolioReport } from "@/components/PortfolioReport";
import { ChatInterface } from "@/components/ChatInterface";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import type {
  SerializedPortfolioRiskAssessment,
  Suggestion,
} from "@/lib/defi/types";
import type { UsageStats } from "@/lib/billing/usage";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get("address");

  const [report, setReport] = useState<string | null>(null);
  const [assessment, setAssessment] =
    useState<SerializedPortfolioRiskAssessment | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isByok, setIsByok] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error || "Daily limit reached");
        return;
      }
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze portfolio");
      }

      const data = await res.json();
      setReport(data.report);
      setAssessment(data.assessment);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [address, router]);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
        setIsByok(data.isByok);
      }
    } catch {
      // Usage fetch is non-critical
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchUsage();
  }, [fetchPortfolio, fetchUsage]);

  if (!address) {
    router.push("/");
    return null;
  }

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

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
          <p className="text-sm text-[#FF7A6E]">{error}</p>
          <Button
            onClick={fetchPortfolio}
            className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Desktop layout */}
      {!error && (
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
                usage={usage}
                isByok={isByok}
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
                  usage={usage}
                  isByok={isByok}
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
