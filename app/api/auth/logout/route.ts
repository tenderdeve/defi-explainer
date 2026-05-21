import { NextResponse } from "next/server";
import { SESSION_COOKIE, NONCE_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
