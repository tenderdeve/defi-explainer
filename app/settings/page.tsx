"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { useWalletSession } from "@/lib/auth/use-wallet-session";
import type { StoredKey } from "@/lib/billing/keys";
import { AVAILABLE_PROVIDERS, type LLMProvider } from "@/lib/llm/types";

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  local: "Local",
};

// "local" is dropped automatically in production via AVAILABLE_PROVIDERS.
const PROVIDERS = AVAILABLE_PROVIDERS.map((id) => ({
  id,
  label: PROVIDER_LABELS[id],
}));

export default function SettingsPage() {
  const router = useRouter();
  const { address, isVerified, isVerifying, error, signIn, signOut } =
    useWalletSession();
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [activeProvider, setActiveProvider] = useState<LLMProvider>("anthropic");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lucid_provider") as LLMProvider | null;
    if (stored && AVAILABLE_PROVIDERS.includes(stored)) setActiveProvider(stored);
  }, []);

  const fetchKeys = useCallback(async () => {
    if (!isVerified) {
      setKeys([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } finally {
      setLoading(false);
    }
  }, [isVerified]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  function selectProvider(p: LLMProvider) {
    setActiveProvider(p);
    localStorage.setItem("lucid_provider", p);
  }

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
        {/* Wallet + ownership */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[#EFE9D8]">Wallet</h2>
          <div className="rounded-xl border border-[#26221C] bg-[#141210] p-4 space-y-3">
            <ConnectButton />
            {address && !isVerified && (
              <div className="space-y-2">
                <p className="text-xs text-[#8E8676]">
                  Sign a free message to prove you own this wallet. This unlocks
                  your encrypted API keys — no transaction, no gas.
                </p>
                <Button
                  onClick={signIn}
                  disabled={isVerifying}
                  className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80 font-medium"
                >
                  {isVerifying ? "Waiting for signature..." : "Verify ownership"}
                </Button>
                {error && <p className="text-xs text-[#FF7A6E]">{error}</p>}
              </div>
            )}
            {isVerified && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#D9FF4A]">
                  Ownership verified
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815] text-xs"
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* API Keys */}
        {isVerified ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#EFE9D8]">
                API Keys
              </h2>
              <p className="text-xs text-[#8E8676] mt-1">
                Bring your own LLM key. Your key is encrypted (AES-256-GCM) and
                tied to your verified wallet — only you can access it, and it is
                never sent back to the browser.
              </p>
            </div>

            {/* Active provider selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8E8676]">Use for analysis:</span>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProvider(p.id)}
                  className={`rounded-lg border px-3 py-1 text-xs ${
                    activeProvider === p.id
                      ? "border-[#D9FF4A] text-[#D9FF4A]"
                      : "border-[#26221C] text-[#8E8676] hover:bg-[#1A1815]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 rounded-xl border border-[#26221C] bg-[#141210] p-4">
              {PROVIDERS.map((p, i) => (
                <div key={p.id} className="space-y-4">
                  {i > 0 && <div className="border-t border-[#26221C]" />}
                  <ApiKeyInput
                    provider={p.id}
                    existingHint={keys.find((k) => k.provider === p.id)?.keyHint}
                    onSaved={fetchKeys}
                  />
                </div>
              ))}
              {loading && (
                <p className="text-xs text-[#5E5749]">Loading keys...</p>
              )}
            </div>
          </section>
        ) : (
          <p className="text-sm text-[#8E8676]">
            Connect and verify your wallet to manage API keys.
          </p>
        )}
      </div>
    </div>
  );
}
