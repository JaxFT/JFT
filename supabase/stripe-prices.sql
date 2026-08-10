-- ═══════════════════════════════════════
--  JFT, Stripe Price IDs (one-time)
--  Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════

update public.products
set stripe_price_id = 'price_1TXflxBedsajl023LlSvfbe9'
where slug = 'how-to-save-blueprint';

-- Original price's Stripe Product got archived/deactivated, checkout
-- started failing with "Price ... is not available to be purchased
-- because its product is not active." Replaced with a new price under
-- an active product (2026-08-10).
update public.products
set stripe_price_id = 'price_1TZE0OBedsajl023tJbVUHOL'
where slug = 'sri-lanka-family-guide';
