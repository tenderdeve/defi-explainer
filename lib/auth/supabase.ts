import { createBrowserClient as createClient } from "@supabase/ssr";
import { createServerClient as createServer } from "@supabase/ssr";
import type { cookies } from "next/headers";

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function createServerSupabaseClient(
  cookieStore: ReturnType<typeof cookies>
) {
  const resolved = await cookieStore;
  return createServer(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return resolved.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              resolved.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components — safe to ignore
          }
        },
      },
    }
  );
}

export async function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = await import(
    "@supabase/supabase-js"
  );
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
