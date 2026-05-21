"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { buildSignMessage } from "@/lib/auth/message";

export interface WalletSession {
  /** Connected wallet address (checksummed), if any. */
  address?: `0x${string}`;
  /** Wallet is connected (RainbowKit). */
  isConnected: boolean;
  /** Connected wallet has a valid ownership session for ITS address. */
  isVerified: boolean;
  /** Signature/verify request in flight. */
  isVerifying: boolean;
  error?: string;
  /** Prompt the wallet to sign once and establish a session. Returns success. */
  signIn: () => Promise<boolean>;
  /** Clear the ownership session. */
  signOut: () => Promise<void>;
}

async function fetchSessionAddress(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { address: string | null };
    return data.address;
  } catch {
    return null;
  }
}

export function useWalletSession(): WalletSession {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>();

  // Keep the session address in sync with the server cookie. Re-check whenever
  // the connected account changes (account switch invalidates verification).
  const acctRef = useRef(address);
  acctRef.current = address;
  useEffect(() => {
    let active = true;
    fetchSessionAddress().then((addr) => {
      if (active) setVerifiedAddress(addr);
    });
    return () => {
      active = false;
    };
  }, [address]);

  const isVerified =
    isConnected &&
    !!address &&
    !!verifiedAddress &&
    verifiedAddress.toLowerCase() === address.toLowerCase();

  const signIn = useCallback(async (): Promise<boolean> => {
    const current = acctRef.current;
    if (!current) {
      setError("Connect a wallet first");
      return false;
    }
    setIsVerifying(true);
    setError(undefined);
    try {
      const nonceRes = await fetch(`/api/auth/nonce?address=${current}`, {
        cache: "no-store",
      });
      if (!nonceRes.ok) throw new Error("Could not start verification");
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const signature = await signMessageAsync({
        message: buildSignMessage(current, nonce),
      });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: current, nonce, signature }),
      });
      if (!verifyRes.ok) {
        const data = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Verification failed");
      }

      setVerifiedAddress(await fetchSessionAddress());
      return true;
    } catch (e) {
      // User rejecting the signature in the wallet lands here too.
      const msg = e instanceof Error ? e.message : "Verification failed";
      setError(/rejected|denied|user reject/i.test(msg) ? "Signature rejected" : msg);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [signMessageAsync]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setVerifiedAddress(null);
    }
  }, []);

  return {
    address,
    isConnected,
    isVerified,
    isVerifying,
    error,
    signIn,
    signOut,
  };
}
