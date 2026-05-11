import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod/v4";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  saveUserKey,
  deleteUserKey,
  listUserKeys,
} from "@/lib/billing/keys";

const saveKeySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  apiKey: z.string().min(1),
});

const deleteKeySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
});

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createServerSupabaseClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await listUserKeys(user.id);
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = saveKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  await saveUserKey(user.id, parsed.data.provider, parsed.data.apiKey);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  await deleteUserKey(user.id, parsed.data.provider);
  return NextResponse.json({ success: true });
}
