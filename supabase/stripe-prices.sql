-- ═══════════════════════════════════════
--  JFT — Stripe Price IDs (one-time)
--  Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════

update public.products
set stripe_price_id = 'price_1TXflxBedsajl023LlSvfbe9'
where slug = 'how-to-save-blueprint';

update public.products
set stripe_price_id = 'price_1TXhZoBedsajl02329Gydaaw'
where slug = 'sri-lanka-family-guide';
