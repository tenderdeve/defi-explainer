"use client";

import { useRef, useEffect, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UsageBanner } from "@/components/UsageBanner";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { SerializedPortfolioRiskAssessment } from "@/lib/defi/types";
import type { UsageStats } from "@/lib/billing/usage";

interface ChatInterfaceProps {
  walletAddress: string;
  portfolioContext: SerializedPortfolioRiskAssessment | null;
  usage: UsageStats | null;
  isByok?: boolean;
  onNavigateToSettings?: () => void;
}

const STARTER_QUESTIONS = [
  "What are my biggest risks?",
  "How can I earn more yield?",
  "Explain my health factor",
  "What assets are sitting idle?",
];

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatInterface({
  walletAddress,
  portfolioContext,
  usage,
  isByok,
  onNavigateToSettings,
}: ChatInterfaceProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/chat",
      body: {
        walletAddress,
        portfolioContext,
      },
    }),
    onError: (err) => {
      if (err.message?.includes("429")) {
        setShowUpgrade(true);
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(text?: string) {
    const msgText = text ?? inputValue.trim();
    if (!msgText) return;
    setInputValue("");
    await sendMessage({ text: msgText });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Usage banner */}
      {usage && <UsageBanner usage={usage} isByok={isByok} />}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-sm text-[#8E8676]">
              Ask anything about your portfolio
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#26221C] bg-[#141210] text-[#C9C2B0] hover:border-[#D9FF4A]/30 hover:text-[#D9FF4A] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#D9FF4A]/10 text-[#EFE9D8] border border-[#D9FF4A]/20"
                      : "bg-[#1A1815] text-[#C9C2B0] border border-[#26221C]"
                  }`}
                >
                  {getMessageText(msg)}
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-[#1A1815] border border-[#26221C] rounded-lg px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#8E8676] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#8E8676] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#8E8676] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error display */}
      {error && !showUpgrade && (
        <div className="px-4 py-2 text-xs text-[#FF7A6E] bg-[#2E1916] border-t border-[#26221C]">
          {error.message || "Something went wrong. Please try again."}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 p-4 border-t border-[#26221C]"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about your portfolio..."
          disabled={isStreaming}
          className="flex-1 border-[#26221C] bg-[#141210] text-[#EFE9D8] placeholder:text-[#5E5749] text-sm"
        />
        <Button
          type="submit"
          disabled={isStreaming || !inputValue.trim()}
          className="bg-[#D9FF4A] text-[#0B0A08] hover:bg-[#D9FF4A]/80 font-medium"
        >
          Send
        </Button>
      </form>

      {/* Upgrade prompt */}
      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="chat messages"
        onAddApiKey={() => {
          setShowUpgrade(false);
          onNavigateToSettings?.();
        }}
      />
    </div>
  );
}
