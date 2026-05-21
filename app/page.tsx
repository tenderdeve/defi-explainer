"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { WalletInput } from "@/components/WalletInput";

const FEATURES = [
  {
    icon: "📊",
    title: "Plain English Reports",
    description:
      "Understand every DeFi position — lending, LPs, staking — explained without jargon.",
  },
  {
    icon: "💬",
    title: "AI Chat",
    description:
      "Ask follow-up questions about your portfolio. Grounded in your actual data.",
  },
  {
    icon: "💡",
    title: "Optimization Suggestions",
    description:
      "Find better yields, reduce risk, and put idle assets to work.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  const handleAddressSubmit = useCallback(
    (address: string) => {
      router.push(`/dashboard?address=${address}`);
    },
    [router]
  );

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#EFE9D8]">
          <span className="text-[#D9FF4A]">Lucid</span>
        </h1>
        <p className="text-lg text-[#C9C2B0] max-w-lg mx-auto">
          Paste an Ethereum wallet. Get a plain English DeFi report, AI chat,
          and optimization suggestions.
        </p>
      </div>

      {/* Wallet input */}
      <WalletInput onAddressSubmit={handleAddressSubmit} />

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-[#26221C] bg-[#141210]/60 backdrop-blur p-5 text-center"
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="text-sm font-semibold text-[#EFE9D8] mt-3">
              {f.title}
            </h3>
            <p className="text-xs text-[#8E8676] mt-1 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <p className="text-xs text-[#5E5749] mt-16 text-center max-w-md">
        Lucid is for informational purposes only. Not financial advice. We only
        ever request a free off-chain signature to verify wallet ownership —
        never a transaction or your private keys.
      </p>
    </main>
  );
}
