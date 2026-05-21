import { NextRequest, NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";
import { z } from "zod/v4";
import { buildSignMessage } from "@/lib/auth/message";
import {
  nonceMatches,
  createSessionToken,
  NONCE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";

const verifySchema = z.object({
  address: z.string().refine((v) => isAddress(v), "Invalid address"),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { address, nonce, signature } = parsed.data;

  // The submitted nonce must match the httpOnly cookie we issued (one-time).
  const cookieNonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!nonceMatches(cookieNonce, address, nonce)) {
    return NextResponse.json(
      { error: "Nonce expired or invalid — try again" },
      { status: 400 }
    );
  }

  // Verify the signature over the exact message rebuilt from address + nonce.
  const message = buildSignMessage(address, nonce);
  let valid = false;
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }
  if (!valid) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  // Consume the nonce (clear it) so the signature cannot be replayed.
  response.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, createSessionToken(address), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
