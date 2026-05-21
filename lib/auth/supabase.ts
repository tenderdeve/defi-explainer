/**
 * Server-side Supabase access. The app no longer uses Supabase Auth — wallet
 * ownership is proven via lib/auth/session.ts and key rows are scoped by
 * wallet address. All key storage runs through the service-role client.
 */
export async function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = await import(
    "@supabase/supabase-js"
  );
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
