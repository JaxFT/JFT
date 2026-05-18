-- ═══════════════════════════════════════
--  JFT, WEB GUIDES + APP SETTINGS
--  Run in: Supabase Dashboard > SQL Editor
--
--  Adds:
--   - guides:        structured web-rendered guides authored via the
--                    /admin/guides/draft wizard. Distinct from the
--                    PDF guides stored in the products table.
--   - app_settings:  k/v store for editable site-wide settings
--                    (currently just "about_us").
-- ═══════════════════════════════════════

-- ── GUIDES ────────────────────────────
create table if not exists public.guides (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  subtitle        text,
  country         text,
  cover_image     text,
  status          text not null default 'draft' check (status in ('draft','published')),
  is_premium      boolean not null default true,   -- included in Premium
  price_pence     integer not null default 0,      -- one-off price (0 = no one-off sale yet)
  tags            text[] not null default '{}',
  -- Structured content. Shape:
  -- {
  --   "why":            { "body": "<markdown>" },
  --   "highlights":     { "body": "<markdown>" },
  --   "needToKnows":    { "body": "<markdown>" },
  --   "destinations":   [ { "id": "...", "name": "Weligama", "body": "<markdown>", "order": 0 }, ... ],
  --   "themedSections": [ { "id": "...", "title": "...",     "body": "<markdown>", "order": 0 }, ... ],
  --   "finalThoughts":  { "body": "<markdown>" },
  --   "hideAbout":      false
  -- }
  sections        jsonb not null default '{}'::jsonb,
  preview_destinations integer not null default 1, -- how many destination blocks shown to non-buyers
  published_at    timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists guides_updated_at on public.guides;
create trigger guides_updated_at before update on public.guides
  for each row execute procedure public.set_updated_at();

create index if not exists guides_status_idx on public.guides (status);
create index if not exists guides_published_at_idx on public.guides (published_at desc);

alter table public.guides enable row level security;

drop policy if exists "guides_select_published" on public.guides;
create policy "guides_select_published" on public.guides
  for select using (status = 'published');

drop policy if exists "guides_admin_select" on public.guides;
create policy "guides_admin_select" on public.guides
  for select using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "guides_admin_insert" on public.guides;
create policy "guides_admin_insert" on public.guides
  for insert with check (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "guides_admin_update" on public.guides;
create policy "guides_admin_update" on public.guides
  for update using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "guides_admin_delete" on public.guides;
create policy "guides_admin_delete" on public.guides
  for delete using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

-- ── APP_SETTINGS ──────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute procedure public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (true);

drop policy if exists "app_settings_admin_insert" on public.app_settings;
create policy "app_settings_admin_insert" on public.app_settings
  for insert with check (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "app_settings_admin_update" on public.app_settings;
create policy "app_settings_admin_update" on public.app_settings
  for update using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

-- ── SEED ──────────────────────────────
-- Seed the About Us text used by every web guide. Lifted from the
-- Sri Lanka PDF; safe to re-run because of the conflict clause.
insert into public.app_settings (key, value)
values (
  'about_us',
  $about$We're Bec, Oli & Jax, a family who chose to stop waiting and start living. In September 2025, we left the UK behind to travel full time as a family. Not on a gap year. Not on a short break. But properly, slowly, intentionally and together.

Like many families, we were doing what we were supposed to do: holidays squeezed into school breaks, trips planned for the weekend and a constant feeling that there had to be more than this. The traditional school system wasn't working for Jax, and it wasn't working for us either. We wanted freedom, flexibility, and the chance to actually experience the world, not just rush through it for two weeks at a time.

So we did the scary thing, we saved hard. We sold and stored our stuff. We took Jax out of school. And we hit the road.

Since then, we've travelled extensively through Morocco, spent two months in Thailand, and nearly three months exploring Sri Lanka, slow travelling our way through each country rather than just ticking off highlights.

These guides are built from everything we've learned along the way, visas, transport, costs, where to stay, what's actually worth doing, and what we'd skip next time. They're honest, practical, and designed to help you travel smarter, longer, and with less stress, whether you're coming for two weeks or two months.

If you're dreaming of seeing more of the world, especially with kids, we hope our experiences help make it easier for you to do the same.$about$
)
on conflict (key) do nothing;
