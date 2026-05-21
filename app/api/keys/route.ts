import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSessionAddress } from "@/lib/auth/session";
import {
  saveUserKey,
  deleteUserKey,
  listUserKeys,
} from "@/lib/billing/keys";
import { isProviderAllowed } from "@/lib/llm/types";

const saveKeySchema = z.object({
  provider: z.enum(["anthropic", "openai", "local"]),
  apiKey: z.string().min(1),
});

const deleteKeySchema = z.object({
  provider: z.enum(["anthropic", "openai", "local"]),
});

export async function GET(request: NextRequest) {
  try {
    const address = getSessionAddress(request);
    if (!address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await listUserKeys(address);
    return NextResponse.json({ keys });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const address = getSessionAddress(request);
    if (!address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = saveKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (!isProviderAllowed(parsed.data.provider)) {
      return NextResponse.json(
        { error: "The local model is only available in development." },
        { status: 400 }
      );
    }

    const result = await saveUserKey(address, parsed.data.provider, parsed.data.apiKey);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, hint: result.hint });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const address = getSessionAddress(request);
    if (!address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = deleteKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    await deleteUserKey(address, parsed.data.provider);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
