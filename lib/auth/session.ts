import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Wallet ownership auth — fully DB-free.
//
// Flow: GET /api/auth/nonce issues a random nonce AND sets it in an httpOnly
// cookie. The wallet signs a message embedding that nonce. POST /api/auth/verify
// checks the submitted nonce matches the cookie, verifies the signature, then
// CLEARS the nonce cookie and sets a signed session cookie. Because the nonce
// cookie is cleared on use, a captured (message, signature) cannot be replayed
// — and a third party can't read the httpOnly nonce to forge a verify call.
// No nonce store, no table: survives serverless/multi-instance with zero state.

export const SESSION_COOKIE = "lucid_session";
export const NONCE_COOKIE = "lucid_nonce";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
export const NONCE_MAX_AGE = 5 * 60; // 5 min to sign

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ---- Nonce -----------------------------------------------------------------

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

/** Value stored in the httpOnly nonce cookie: binds the nonce to an address. */
export function nonceCookieValue(address: string, nonce: string): string {
  return `${address.toLowerCase()}:${nonce}`;
}

/** True if the cookie matches the submitted address + nonce exactly. */
export function nonceMatches(
  cookieValue: string | undefined,
  address: string,
  nonce: string
): boolean {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, nonceCookieValue(address, nonce));
}

// ---- Session ---------------------------------------------------------------

/** Signed session token: base64url(address.expiry).hmac */
export function createSessionToken(address: string): string {
  const body = Buffer.from(
    `${address.toLowerCase()}.${Date.now() + SESSION_TTL_MS}`
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Verify a session token, returning the lowercased address or null. */
export function readSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;

  const [addr, expStr] = Buffer.from(body, "base64url").toString("utf8").split(".");
  const exp = Number(expStr);
  if (!addr || !Number.isFinite(exp) || Date.now() > exp) return null;
  return addr;
}

/** Read + verify the session cookie from a request. */
export function getSessionAddress(request: NextRequest): string | null {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}
