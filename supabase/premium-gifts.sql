-- Admin-gifted Premium (one year, existing accounts only).
--
-- Gifting writes profiles.subscription_tier/subscription_expires_at
-- directly and deliberately leaves stripe_customer_id/
-- stripe_subscription_id untouched. That's what makes it safe: the
-- Stripe webhook (handleSubscriptionChange) only ever updates a
-- profile it can tie to a real subscription id, so it never sees or
-- overwrites a gift. If a gifted user later takes out a real paid
-- subscription, the webhook's own update naturally takes over from
-- there, no special-casing needed.
--
-- premium_gifts is just the audit trail; profiles is the source of
-- truth for access.

create table if not exists public.premium_gifts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  granted_by  text not null,
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  note        text,
  revoked_at  timestamptz
);

alter table public.premium_gifts enable row level security;
-- No policies: only the service-role admin API reads/writes this.

create index if not exists premium_gifts_user_idx
  on public.premium_gifts(user_id);

-- Daily sweep that expires gifted Premium. The where clause is
-- exactly "premium with no real Stripe subscription behind it, past
-- its date" — stripe_subscription_id is only ever set by the Stripe
-- webhook for a real paying subscriber, so this can never touch one.
create extension if not exists pg_cron;

create or replace function public.expire_gifted_premium()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set subscription_tier = 'free'
  where subscription_tier = 'premium'
    and stripe_subscription_id is null
    and subscription_expires_at is not null
    and subscription_expires_at < now();
$$;

-- cron.schedule() isn't a create-or-replace by name on every pg_cron
-- version, so unschedule first to keep this file safely re-runnable.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-gifted-premium-daily') then
    perform cron.unschedule('expire-gifted-premium-daily');
  end if;
end $$;

select cron.schedule(
  'expire-gifted-premium-daily',
  '0 3 * * *',
  $$select public.expire_gifted_premium();$$
);
