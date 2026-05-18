-- ═══════════════════════════════════════
--  JFT, GUIDES (Supabase additions)
--  Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════

-- Extend the existing products table with guide-specific fields.
alter table public.products
  add column if not exists cover_image text,
  add column if not exists preview_path text,
  add column if not exists full_path text,
  add column if not exists preview_page_count integer not null default 0,
  add column if not exists tags text[] not null default '{}',
  add column if not exists subtitle text;

-- Seed the two real guides Bec & Oli wrote.
insert into public.products
  (name, slug, subtitle, description, price_pence, type, active, preview_path, full_path, preview_page_count, tags)
values
  (
    'The Real Sri Lanka Family Guide',
    'sri-lanka-family-guide',
    'A practical, honest guide to travelling Sri Lanka with kids.',
    'Everything we wish we had known before going, where to base, how long for each region, what worked with the family and what we''d skip next time. Written from a real family trip across the island.',
    899,
    'guide',
    true,
    'sri-lanka-preview.pdf',
    'sri-lanka.pdf',
    3,
    array['Asia','Sri Lanka','Family']::text[]
  ),
  (
    'How We Saved for Full-Time Travel, The Blueprint',
    'how-to-save-blueprint',
    'The exact playbook we used to fund leaving the UK with our family.',
    'An honest blueprint for families who want to do this for real. How we restructured spend, what we sold, what we kept, the timeline that worked, and the mistakes we''d undo if we did it again.',
    699,
    'guide',
    true,
    'how-to-save-preview.pdf',
    'how-to-save.pdf',
    4,
    array['Money','Planning','Beginner']::text[]
  )
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price_pence = excluded.price_pence,
  type = excluded.type,
  active = excluded.active,
  preview_path = excluded.preview_path,
  full_path = excluded.full_path,
  preview_page_count = excluded.preview_page_count,
  tags = excluded.tags;
