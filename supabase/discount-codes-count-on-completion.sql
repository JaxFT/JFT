-- Fix: a discount code's usage cap was being consumed the moment
-- someone reached Stripe checkout, not when they actually paid.
-- reserve_discount_code used to increment times_redeemed immediately,
-- and the only way that got given back was checkout.session.expired
-- (30 minutes later). So an abandoned or just-browsing checkout made
-- a low-cap code look "already used" to the next person for half an
-- hour, even though nobody had paid.
--
-- times_redeemed now only counts completed (paid) redemptions.
-- reserve_discount_code still records a 'reserved' row (so the
-- webhook has something to flip to 'completed' or 'released' for an
-- accurate audit trail), but no longer touches times_redeemed or the
-- cap check's outcome for anyone else. complete_discount_reservation
-- is what increments it now, only once Stripe confirms payment.

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

  insert into public.discount_code_redemptions (code_id, product_type, product_ref, user_id)
  values (v.id, p_product_type, p_product_ref, p_user_id)
  returning id into v_redemption_id;

  return query select v_redemption_id, v.percent_off, v.stripe_coupon_id;
end;
$$;

grant execute on function public.reserve_discount_code(text, text, text, uuid) to anon, authenticated, service_role;

create or replace function public.complete_discount_reservation(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_id uuid;
begin
  update public.discount_code_redemptions
    set status = 'completed', completed_at = now()
    where id = p_redemption_id and status = 'reserved'
    returning code_id into v_code_id;

  if v_code_id is not null then
    update public.discount_codes
      set times_redeemed = times_redeemed + 1
      where id = v_code_id;
  end if;
end;
$$;

grant execute on function public.complete_discount_reservation(uuid) to service_role;

-- No longer needs to touch times_redeemed, reservation never
-- increments it any more, so there's nothing to give back.
create or replace function public.release_discount_reservation(p_redemption_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_code_redemptions
    set status = 'released'
    where id = p_redemption_id and status = 'reserved';
$$;

grant execute on function public.release_discount_reservation(uuid) to anon, authenticated, service_role;

-- Recompute every code's count from actual completed redemptions,
-- correcting anything the old reserve-time increment already threw
-- off (e.g. a test click-through that never completed).
update public.discount_codes
set times_redeemed = (
  select count(*) from public.discount_code_redemptions
  where discount_code_redemptions.code_id = discount_codes.id
    and discount_code_redemptions.status = 'completed'
);
