-- ═══════════════════════════════════════
--  JAX FAMILY TRAVELS — SUPABASE SCHEMA
-- ═══════════════════════════════════════
-- Run this in: Supabase Dashboard > SQL Editor

-- ── PROFILES ──────────────────────────
-- Extends auth.users (Supabase manages auth.users automatically)
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text unique,
  full_name             text,
  avatar_url            text,
  subscription_tier     text not null default 'free' check (subscription_tier in ('free','premium')),
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  subscription_expires_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── PRODUCTS ──────────────────────────
-- One-off purchasable items (guides, tools, packs)
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  price_pence     integer not null,               -- e.g. 499 = £4.99
  stripe_price_id text,
  type            text not null check (type in ('guide','tool','pack')),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ── PURCHASES ─────────────────────────
-- Records individual product purchases
create table if not exists public.purchases (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  product_id              uuid not null references public.products(id),
  stripe_payment_intent_id text,
  amount_pence            integer not null,
  purchased_at            timestamptz not null default now(),
  unique(user_id, product_id)
);

-- ── ROW LEVEL SECURITY ────────────────
alter table public.profiles  enable row level security;
alter table public.products  enable row level security;
alter table public.purchases enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Products: anyone can read active products
create policy "products_select_active" on public.products for select using (active = true);

-- Purchases: users see only their own
create policy "purchases_select_own" on public.purchases for select using (auth.uid() = user_id);

-- ── UPDATED_AT TRIGGER ────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── SEED: PRODUCTS ────────────────────
insert into public.products (name, slug, description, price_pence, type) values
  ('Family Travel in Penang',          'family-travel-penang',      'Everything you need for Penang with kids.',         499, 'guide'),
  ('Slow Travel Portugal with Kids',   'slow-travel-portugal',      'A month-by-month Portugal family guide.',           499, 'guide'),
  ('I Want To Travel — Decision Tool', 'i-want-to-travel',          'Find out if long-term family travel is right for you.', 299, 'tool')
on conflict (slug) do nothing;
