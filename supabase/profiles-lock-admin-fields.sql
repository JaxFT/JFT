-- Lock down the columns on profiles that a normal user should not be
-- able to set directly via the anon/authenticated JWT.
--
-- Background: profiles_update_own grants `for update using (auth.uid()=id)`
-- with no `with check` and no column whitelist, so a signed-in user
-- could open the browser console and run:
--   supabase.from('profiles').update({ subscription_tier: 'premium' }).eq('id', me)
-- and get premium access without paying.
--
-- This trigger fires BEFORE UPDATE. If the call is coming from the
-- service role (Stripe webhook, admin tools), it does nothing — those
-- paths legitimately need to change tier / stripe ids / expiry / etc.
-- For any other role (authenticated, anon) it silently restores the
-- locked columns to their OLD values, so the UPDATE succeeds for the
-- editable fields (name, username, marketing opt-in, etc.) but the
-- locked fields can't move.

create or replace function public.profiles_lock_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role bypass — webhooks and admin tools update these fields.
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  -- Restore the protected columns to whatever they were before the
  -- update. Editable columns (full_name, username, avatar_url,
  -- marketing_opt_in, instagram_handle, username_is_instagram,
  -- home_country_iso2) pass through unchanged.
  new.subscription_tier         := old.subscription_tier;
  new.stripe_customer_id        := old.stripe_customer_id;
  new.stripe_subscription_id    := old.stripe_subscription_id;
  new.subscription_expires_at   := old.subscription_expires_at;
  new.cancellation_requested_at := old.cancellation_requested_at;
  new.welcome_sent_at           := old.welcome_sent_at;
  return new;
end;
$$;

drop trigger if exists profiles_lock_admin_fields on public.profiles;
create trigger profiles_lock_admin_fields
  before update on public.profiles
  for each row
  execute procedure public.profiles_lock_admin_fields();
