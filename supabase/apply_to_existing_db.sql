-- BYOK-only reset for an EXISTING dev database (pre-launch, no real data).
-- Run once in the Supabase SQL Editor. Matches migrations/001_initial_schema.sql.
-- Drops the old auth-tied schema and recreates the wallet-address-keyed schema.

drop table if exists usage cascade;
drop table if exists subscriptions cascade;
drop table if exists user_api_keys cascade;
drop function if exists increment_usage cascade;

create table user_api_keys (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  provider text not null check (provider in ('anthropic', 'openai', 'local')),
  encrypted_key text not null,
  key_hint text not null,
  is_valid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(wallet_address, provider)
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_api_keys_updated_at
  before update on user_api_keys
  for each row execute function update_updated_at_column();
