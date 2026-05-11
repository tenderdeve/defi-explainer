"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  onAddApiKey: () => void;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  feature,
  onAddApiKey,
}: UpgradePromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#131210] border-[#26221C] text-[#EFE9D8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Daily {feature} limit reached
          </DialogTitle>
          <DialogDescription className="text-[#8E8676]">
            You&apos;ve used all your free {feature} for today. Unlock unlimited
            access:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <button
            onClick={onAddApiKey}
            className="w-full rounded-lg border border-[#D9FF4A]/30 bg-[#D9FF4A]/5 p-4 text-left hover:bg-[#D9FF4A]/10 transition-colors"
          >
            <div className="text-sm font-medium text-[#D9FF4A]">
              Bring your own API key
            </div>
            <div className="text-xs text-[#8E8676] mt-1">
              Free forever. Use your own Claude or OpenAI key for unlimited
              access.
            </div>
          </button>

          <Button
            variant="outline"
            className="w-full border-[#26221C] bg-[#1A1815] text-[#C9C2B0] hover:bg-[#26221C]"
            disabled
          >
            Upgrade to Pro — $9/mo (coming soon)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
