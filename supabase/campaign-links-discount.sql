-- Lets a campaign link auto-apply an existing discount code when
-- someone lands via it and buys the guide it points to — no code
-- typing needed, the % off just applies. Reuses discount_codes as-is
-- (Stripe coupon, usage cap, redemption tracking all already there),
-- this just attaches one to a link. Nullable: most campaign links
-- won't have a discount.

alter table public.campaign_links
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null;
