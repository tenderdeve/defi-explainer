"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LLMProvider } from "@/lib/llm/types";

interface ApiKeyInputProps {
  provider: LLMProvider;
  existingHint?: string | null;
  onSaved: () => void;
}

export function ApiKeyInput({
  provider,
  existingHint,
  onSaved,
}: ApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerLabel = provider === "anthropic" ? "Claude (Anthropic)" : "OpenAI";
  const placeholder =
    provider === "anthropic" ? "sk-ant-api03-..." : "sk-...";

  async function handleSave() {
    if (!key.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save key");
      }

      setKey("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      onSaved();
    } catch {
      setError("Failed to remove key");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-[#C9C2B0]">{providerLabel}</Label>

      {existingHint ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-[#26221C] bg-[#1A1815] px-3 py-2 text-sm font-mono text-[#8E8676]">
            {existingHint}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
            className="border-[#26221C] text-[#FF8C7E] hover:bg-[#2E1916] hover:text-[#FFA298]"
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            placeholder={placeholder}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="flex-1 border-[#26221C] bg-[#1A1815] text-[#EFE9D8] placeholder:text-[#5E5749] font-mono text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={loading || !key.trim()}
            className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80 font-medium"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-[#FF7A6E]">{error}</p>}
    </div>
  );
}
