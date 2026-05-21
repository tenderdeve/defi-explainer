"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WalletInputProps {
  onAddressSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function WalletInput({ onAddressSubmit, isLoading }: WalletInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { address: connectedAddress, isConnected } = useAccount();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Enter an Ethereum address");
      return;
    }
    if (!isAddress(trimmed)) {
      setError("Invalid Ethereum address");
      return;
    }
    setError(null);
    onAddressSubmit(trimmed);
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      {/* Paste any address (read-only analysis target) */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="0x... wallet to analyze"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          className="flex-1 h-12 border-[#26221C] bg-[#141210] text-[#EFE9D8] placeholder:text-[#5E5749] font-mono text-sm rounded-lg"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-12 px-6 bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80 font-semibold rounded-lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#0B0A08]/30 border-t-[#0B0A08] rounded-full animate-spin" />
              Analyzing
            </span>
          ) : (
            "Analyze"
          )}
        </Button>
      </form>

      {error && <p className="text-xs text-[#FF7A6E]">{error}</p>}

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#26221C]" />
        <span className="text-xs text-[#5E5749] uppercase tracking-wider">
          or connect wallet
        </span>
        <div className="flex-1 h-px bg-[#26221C]" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <ConnectButton />
        {isConnected && connectedAddress && (
          <Button
            type="button"
            onClick={() => onAddressSubmit(connectedAddress)}
            disabled={isLoading}
            variant="outline"
            className="border-[#26221C] text-[#C9C2B0] hover:bg-[#1A1815] text-sm"
          >
            Analyze my wallet
          </Button>
        )}
      </div>
    </div>
  );
}
