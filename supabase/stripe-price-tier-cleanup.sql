-- Move every remaining guide off its old, dedicated one-off Stripe
-- price onto the shared value-tier prices (£1.99/£2.99/£4.99/£6.99/
-- £8.99). Prompted by checkout failing on the Sri Lanka guide with
-- "Price ... is not available to be purchased because its product is
-- not active" — its Stripe Product had been archived. Per-guide
-- one-off Products are fragile this way; the shared tier prices are
-- meant to replace them everywhere going forward.
--
-- At the time of writing, sri-lanka-family-guide (products) and
-- how-we-spent-2-weeks-in-nepal / renting-a-tuk-tuk-in-sri-lanka /
-- 100-free-things-to-do-in-bangkok (guides) were already on a correct
-- tier price, only these two were still stale:

update public.products
set stripe_price_id = 'price_1TZE40Bedsajl023eFWpNnIM'  -- £6.99 tier
where slug = 'how-to-save-blueprint';

update public.guides
set stripe_price_id = 'price_1TZE4BBedsajl0232mXDp5bq'  -- £4.99 tier
where slug = 'how-we-spent-two-weeks-in-the-maldives';

-- Reference: the full tier map as of 2026-08-11.
--   £1.99 = price_1TZOtLBedsajl023PadqOgli
--   £2.99 = price_1TZE4JBedsajl0230A10MWbc
--   £4.99 = price_1TZE4BBedsajl0232mXDp5bq
--   £6.99 = price_1TZE40Bedsajl023eFWpNnIM
--   £8.99 = price_1TZE0OBedsajl023tJbVUHOL
