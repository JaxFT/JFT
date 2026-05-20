-- Web-guide download purchase flow
--
-- The legacy /products + /purchases tables stay untouched. Web guides
-- live in the `guides` table and need their own purchase ledger so we
-- can keep the FK integrity (purchases.product_id references products,
-- which web guides aren't in) without forcing every guide into the
-- products table.
--
-- One row per (user, guide). UNIQUE keeps Stripe webhook retries
-- idempotent — second attempt for the same checkout just fails to
-- insert silently.

alter table public.guides
  add column if not exists stripe_price_id text;

create table if not exists public.web_guide_purchases (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  guide_id                 uuid not null references public.guides(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_pence             integer not null,
  purchased_at             timestamptz not null default now(),
  unique (user_id, guide_id)
);

alter table public.web_guide_purchases enable row level security;

-- Users can see their own purchases (for the "Download my copy" button).
drop policy if exists "web_guide_purchases_select_own" on public.web_guide_purchases;
create policy "web_guide_purchases_select_own"
  on public.web_guide_purchases for select
  using (auth.uid() = user_id);

-- No insert policy: only the service-role webhook writes here.
create index if not exists web_guide_purchases_user_idx
  on public.web_guide_purchases(user_id);
create index if not exists web_guide_purchases_guide_idx
  on public.web_guide_purchases(guide_id);

-- Wire up the Maldives guide. Run this once the schema change is in.
-- If the slug differs, update accordingly.
update public.guides
  set stripe_price_id = 'price_1TZ0l2Bedsajl023BtVZvqkQ'
  where slug = 'maldives';
