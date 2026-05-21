import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  generateNonce,
  nonceCookieValue,
  NONCE_COOKIE,
  NONCE_MAX_AGE,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const nonce = generateNonce();
  const response = NextResponse.json({ nonce });
  // Bind the nonce to this address in an httpOnly cookie; consumed on verify.
  response.cookies.set(NONCE_COOKIE, nonceCookieValue(address, nonce), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: NONCE_MAX_AGE,
  });
  return response;
}
