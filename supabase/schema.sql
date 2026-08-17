-- =========================================================
-- BizGrow AI — Supabase database schema
-- Run this once in the Supabase SQL Editor (or via the CLI)
-- against a fresh project. Safe to re-run: uses IF NOT EXISTS
-- / CREATE OR REPLACE where possible.
-- =========================================================

-- ---------------------------------------------------------
-- profiles: one row per authenticated user
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------
-- businesses: one row per user's business profile
-- ---------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null,
  category text,
  owner_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  website text,
  instagram text,
  facebook text,
  description text,
  products_services text,
  target_customers text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own" on public.businesses
  for select using (auth.uid() = user_id);

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses
  for insert with check (auth.uid() = user_id);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "businesses_delete_own" on public.businesses;
create policy "businesses_delete_own" on public.businesses
  for delete using (auth.uid() = user_id);

-- keep updated_at current on every change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- subscriptions: trial + plan status per user
-- ---------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan text not null default 'free_trial',       -- free_trial | starter | growth | business
  status text not null default 'trial',          -- trial | active | expired | cancelled
  trial_start timestamptz,
  trial_end timestamptz,
  subscription_start timestamptz,
  subscription_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: once Razorpay is integrated, subscription status should only be
-- flipped to 'active' by a server-side function (using the service-role
-- key) after payment verification — never trust a client-side update for
-- unlocking paid features.

-- ---------------------------------------------------------
-- generated_content: saved AI output (the content library)
-- ---------------------------------------------------------
create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  category text,           -- Social Posts | Advertisements | WhatsApp | Reel Scripts | Captions | Offers
  content_type text,       -- e.g. "Instagram Post", "Festival Offer"
  input_data jsonb,        -- the form inputs used to generate this content
  generated_content text,  -- the AI output, stored as plain text
  created_at timestamptz not null default now()
);

alter table public.generated_content enable row level security;

drop policy if exists "content_select_own" on public.generated_content;
create policy "content_select_own" on public.generated_content
  for select using (auth.uid() = user_id);

drop policy if exists "content_insert_own" on public.generated_content;
create policy "content_insert_own" on public.generated_content
  for insert with check (auth.uid() = user_id);

drop policy if exists "content_delete_own" on public.generated_content;
create policy "content_delete_own" on public.generated_content
  for delete using (auth.uid() = user_id);

create index if not exists idx_generated_content_user on public.generated_content (user_id, created_at desc);

-- ---------------------------------------------------------
-- usage: lightweight event log, powers Analytics + rate limiting
-- ---------------------------------------------------------
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,      -- e.g. "ai_content_generator", "whatsapp_marketing"
  usage_count integer not null default 1,
  usage_date date not null default current_date
);

alter table public.usage enable row level security;

drop policy if exists "usage_select_own" on public.usage;
create policy "usage_select_own" on public.usage
  for select using (auth.uid() = user_id);

drop policy if exists "usage_insert_own" on public.usage;
create policy "usage_insert_own" on public.usage
  for insert with check (auth.uid() = user_id);

create index if not exists idx_usage_user_date on public.usage (user_id, usage_date);

-- ---------------------------------------------------------
-- Optional: auto-create a profile row when a new auth user signs up.
-- The frontend also upserts a profile after signUp() as a fallback,
-- so this trigger is a safety net, not a hard requirement.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
