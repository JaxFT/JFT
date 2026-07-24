-- Admin-managed discount codes.
--
-- Each code maps 1:1 to a real Stripe Coupon (created by the admin API
-- when the code is created), so Stripe still does the actual invoice
-- math. Everything else — validity, the usage cap, which product
-- types a code applies to, and tracking — lives here, never in
-- Stripe's own promotion-codes UI.
--
-- Redemption is reserve-then-confirm: `reserve_discount_code` is
-- called at Stripe Checkout Session creation time (atomically checks
-- the cap and increments times_redeemed), not when the code is merely
-- typed into a form. If the session is abandoned or fails to create,
-- `release_discount_reservation` gives the slot back. This means the
-- cap can never be oversold, and abandoned checkouts don't burn a
-- redemption.

create table if not exists public.discount_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  percent_off       integer not null check (percent_off between 1 and 100),
  max_redemptions   integer not null check (max_redemptions > 0),
  times_redeemed    integer not null default 0,
  applies_to_premium boolean not null default true,
  applies_to_guides  boolean not null default false,
  applies_to_packs   boolean not null default false,
  active            boolean not null default true,
  expires_at        timestamptz,
  stripe_coupon_id  text not null,
  created_by        text not null,
  created_at        timestamptz not null default now()
);

alter table public.discount_codes enable row level security;
-- No policies: reads/writes only ever happen through service-role
-- API routes (admin CRUD, the validate endpoint, the reserve/release
-- RPCs below are SECURITY DEFINER so they don't need grants on the
-- table itself). Locked down from anon/authenticated by default.

create table if not exists public.discount_code_redemptions (
  id                        uuid primary key default gen_random_uuid(),
  code_id                   uuid not null references public.discount_codes(id) on delete cascade,
  product_type              text not null check (product_type in ('premium_annual', 'guide', 'pack')),
  product_ref               text,
  user_id                   uuid references auth.users(id) on delete set null,
  stripe_checkout_session_id text unique,
  status                    text not null default 'reserved' check (status in ('reserved', 'completed', 'released')),
  reserved_at               timestamptz not null default now(),
  completed_at              timestamptz
);

alter table public.discount_code_redemptions enable row level security;
-- No policies: written only by the RPCs below and the service-role
-- webhook/checkout routes.

create index if not exists discount_code_redemptions_code_idx
  on public.discount_code_redemptions(code_id);

-- Atomically checks a code is usable for the given product type and,
-- if so, reserves one redemption slot (increments times_redeemed) AND
-- records the redemption row, in one transaction. `for update` locks
-- the discount_codes row so concurrent checkouts can't both read
-- times_redeemed < max_redemptions and both succeed past the cap.
-- Doing the insert inside the same function (rather than as a
-- separate client-side insert after) means there's no window where a
-- slot is reserved but nothing records it.
create or replace function public.reserve_discount_code(
  p_code text,
  p_product_type text,
  p_product_ref text,
  p_user_id uuid
)
returns table(redemption_id uuid, percent_off integer, stripe_coupon_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.discount_codes%rowtype;
  v_redemption_id uuid;
begin
  select * into v from public.discount_codes
  where upper(discount_codes.code) = upper(p_code)
  for update;

  if not found
     or not v.active
     or (v.expires_at is not null and v.expires_at <= now())
     or v.times_redeemed >= v.max_redemptions
     or (p_product_type = 'premium_annual' and not v.applies_to_premium)
     or (p_product_type = 'guide' and not v.applies_to_guides)
     or (p_product_type = 'pack' and not v.applies_to_packs)
  then
    return;
  end if;

  update public.discount_codes
    set times_redeemed = times_redeemed + 1
    where id = v.id;

  insert into public.discount_code_redemptions (code_id, product_type, product_ref, user_id)
  values (v.id, p_product_type, p_product_ref, p_user_id)
  returning id into v_redemption_id;

  return query select v_redemption_id, v.percent_off, v.stripe_coupon_id;
end;
$$;

grant execute on function public.reserve_discount_code(text, text, text, uuid) to anon, authenticated, service_role;

-- Gives back a reservation that never completed (checkout session
-- creation failed, or the session expired unpaid). No-op if the
-- redemption row is already completed or was already released.
create or replace function public.release_discount_reservation(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_id uuid;
begin
  update public.discount_code_redemptions
    set status = 'released'
    where id = p_redemption_id and status = 'reserved'
    returning code_id into v_code_id;

  if v_code_id is not null then
    update public.discount_codes
      set times_redeemed = greatest(times_redeemed - 1, 0)
      where id = v_code_id;
  end if;
end;
$$;

grant execute on function public.release_discount_reservation(uuid) to anon, authenticated, service_role;

-- Marks a reservation as an actual, paid redemption. Called only from
-- the webhook (service_role) once Stripe confirms the checkout paid.
-- Idempotent: repeated webhook deliveries just re-set the same status.
create or replace function public.complete_discount_reservation(p_redemption_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_code_redemptions
    set status = 'completed', completed_at = now()
    where id = p_redemption_id and status = 'reserved';
$$;

grant execute on function public.complete_discount_reservation(uuid) to service_role;
