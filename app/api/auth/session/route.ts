import { NextRequest, NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  return NextResponse.json({ address: getSessionAddress(request) });
}
