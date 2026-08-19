-- Tracks the one-time free Adventure Pack claim for completing a
-- Travel Profile (photo + 3 "been" + 2 "want to go" + public). Kept
-- separate from jax_pack_purchases (which just records "this user can
-- view this pack") so there's an explicit, unambiguous audit trail of
-- *why* the free pack was granted — same reasoning as premium_gifts
-- being separate from the Stripe subscription fields.

create table if not exists public.profile_completion_pack_claims (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  country_slug  text not null,
  claimed_at    timestamptz not null default now()
);

alter table public.profile_completion_pack_claims enable row level security;

drop policy if exists "profile_completion_pack_claims_select" on public.profile_completion_pack_claims;
create policy "profile_completion_pack_claims_select" on public.profile_completion_pack_claims
  for select using (auth.uid() = user_id);
