"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import type { StoredKey } from "@/lib/billing/keys";

interface UsageResponse {
  reports: { used: number; limit: number };
  chatMessages: { used: number; limit: number };
  tier: string;
  isByok: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, usageRes] = await Promise.all([
        fetch("/api/keys"),
        fetch("/api/usage"),
      ]);

      if (keysRes.status === 401 || usageRes.status === 401) {
        router.push("/");
        return;
      }

      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys);
      }
      if (usageRes.ok) {
        setUsage(await usageRes.json());
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const anthropicKey = keys.find((k) => k.provider === "anthropic");
  const openaiKey = keys.find((k) => k.provider === "openai");

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#26221C] px-4 py-3">
        <h1 className="text-sm font-semibold text-[#EFE9D8]">
          <span className="text-[#D9FF4A]">Lucid</span>{" "}
          <span className="text-[#8E8676]">/ Settings</span>
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815] text-xs"
        >
          Back
        </Button>
      </div>

      <div className="max-w-2xl mx-auto w-full p-6 space-y-8">
        {/* API Keys */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#EFE9D8]">
              API Keys
            </h2>
            <p className="text-xs text-[#8E8676] mt-1">
              Add your own API key for unlimited usage. Keys are encrypted at
              rest and never sent to the client.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-[#26221C] bg-[#141210] p-4">
            <ApiKeyInput
              provider="anthropic"
              existingHint={anthropicKey?.keyHint}
              onSaved={fetchData}
            />
            <div className="border-t border-[#26221C]" />
            <ApiKeyInput
              provider="openai"
              existingHint={openaiKey?.keyHint}
              onSaved={fetchData}
            />
          </div>
        </section>

        {/* Tier */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[#EFE9D8]">
            Current Tier
          </h2>
          <div className="rounded-xl border border-[#26221C] bg-[#141210] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#EFE9D8] capitalize">
                  {usage?.tier || "free"}
                </span>
                {usage?.isByok && (
                  <span className="ml-2 text-xs text-[#D9FF4A]">
                    Unlimited (BYOK)
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-[#26221C] text-[#5E5749] text-xs"
              >
                Upgrade to Pro — coming soon
              </Button>
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[#EFE9D8]">
            Today&apos;s Usage
          </h2>
          {usage && !usage.isByok ? (
            <div className="rounded-xl border border-[#26221C] bg-[#141210] p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#8E8676]">Reports</span>
                  <span className="font-mono text-[#C9C2B0]">
                    {usage.reports.used} / {usage.reports.limit}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (usage.reports.used / usage.reports.limit) * 100
                  )}
                  className="h-1.5 bg-[#1A1815] [&>div]:bg-[#D9FF4A]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#8E8676]">Chat messages</span>
                  <span className="font-mono text-[#C9C2B0]">
                    {usage.chatMessages.used} / {usage.chatMessages.limit}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (usage.chatMessages.used / usage.chatMessages.limit) * 100
                  )}
                  className="h-1.5 bg-[#1A1815] [&>div]:bg-[#D9FF4A]"
                />
              </div>
              <p className="text-xs text-[#5E5749]">
                Usage resets daily at midnight UTC.
              </p>
            </div>
          ) : usage?.isByok ? (
            <div className="rounded-xl border border-[#26221C] bg-[#141210] p-4">
              <p className="text-sm text-[#8E8676]">
                Unlimited usage with your own API key. No limits applied.
              </p>
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-[#26221C] bg-[#141210] p-4">
              <p className="text-sm text-[#5E5749]">Loading...</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
