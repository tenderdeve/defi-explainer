-- API Keys (encrypted BYOK keys)
create table user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('anthropic', 'openai')),
  encrypted_key text not null,
  key_hint text not null,
  is_valid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- Auto-update updated_at on user_api_keys
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

-- Usage Tracking (daily limits)
create table usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  reports_count int default 0 check (reports_count >= 0),
  chat_messages_count int default 0 check (chat_messages_count >= 0),
  unique(user_id, date)
);

-- Subscriptions (Pro tier — deferred)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- RLS: users can only access their own data
alter table user_api_keys enable row level security;
alter table usage enable row level security;
alter table subscriptions enable row level security;

create policy "Users can manage own API keys"
  on user_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view own usage"
  on usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own usage"
  on usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Note: Server-side operations use the Supabase service role client,
-- which bypasses RLS entirely. No explicit service role policies needed.
