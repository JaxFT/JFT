-- ═══════════════════════════════════════
--  JFT, BLOG POSTS (Supabase)
--  Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  body_markdown   text not null default '',
  cover_image     text,
  tags            text[] not null default '{}',
  author          text not null default 'Jax Family Travels',
  status          text not null default 'draft' check (status in ('draft','published')),
  is_premium      boolean not null default false,
  published_at    timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Backfill column on existing installs (no-op when the column already exists).
alter table public.blog_posts add column if not exists is_premium boolean not null default false;

-- Keep updated_at fresh
drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute procedure public.set_updated_at();

-- Helpful indexes
create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc);

-- ── ROW LEVEL SECURITY ────────────────
alter table public.blog_posts enable row level security;

-- Public can read PUBLISHED posts
drop policy if exists "blog_posts_select_published" on public.blog_posts;
create policy "blog_posts_select_published" on public.blog_posts
  for select using (status = 'published');

-- Admin emails can do everything (read drafts, write, delete)
-- Update this list if you add more admins.
drop policy if exists "blog_posts_admin_select" on public.blog_posts;
create policy "blog_posts_admin_select" on public.blog_posts
  for select using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "blog_posts_admin_insert" on public.blog_posts;
create policy "blog_posts_admin_insert" on public.blog_posts
  for insert with check (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "blog_posts_admin_update" on public.blog_posts;
create policy "blog_posts_admin_update" on public.blog_posts
  for update using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "blog_posts_admin_delete" on public.blog_posts;
create policy "blog_posts_admin_delete" on public.blog_posts
  for delete using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

-- ── SEED: import the existing Penang markdown post as a published row.
-- Safe to re-run: 'on conflict' protects against duplicates.
insert into public.blog_posts
  (slug, title, excerpt, body_markdown, cover_image, tags, status, published_at)
values (
  'best-restaurant-penang',
  'The Best Family Meal We''ve Had in Penang (And It Cost Less Than £8)',
  'Tucked down a back lane in Georgetown, Kedai Kopi Heng Huat serves the kind of char kway teow that makes you cancel all your afternoon plans.',
  $blog$
We almost walked straight past it.

No sign to speak of, three plastic tables spilling onto the pavement, and a ceiling fan working so hard it rattled. But the smell from the wok stopped us before we''d gone another ten steps, that scorched, high-heat smell of a properly seasoned carbon steel pan, and we turned back.

Kedai Kopi Heng Huat, tucked into a lane off Carnarvon Street in Georgetown''s old quarter, has been serving the same menu since 1978. The man at the wok, Ah Huat, third generation, doesn''t look up when you arrive. He doesn''t need to. A laminated card on the table lists four things. You point at what you want.

## What We Ordered

**Char kway teow**, the reason to come. Broad flat rice noodles, lap cheong (Chinese sausage), egg, bean sprouts, and cockles, cooked hard and fast over a charcoal flame. The cockles are non-negotiable, even if your children look suspicious. Ours were converted after the first mouthful. The wok hei, that slightly smoky, caramelised depth you only get from a fire that''s been burning long enough, is extraordinary. You will not find better in Penang. We tried.

**Lor bak**, five-spice pork rolls wrapped in beancurd skin, deep fried, served with a thick dipping sauce that''s halfway between soy and caramel. Ordered this for the kids as a side. They ate most of ours too.

**Cendol**, a bowl of crushed ice, green pandan jelly noodles, coconut milk, and palm sugar syrup. It sounds odd. It''s perfect in the Penang heat at noon. Everyone needs one.

## What It Cost

Four people, two rounds of char kway teow, lor bak, four cendols, and four drinks: RM 56. That''s just under £10. We tipped because it felt criminal not to.

## Practical Notes for Families

- **Go early.** Ah Huat starts at 11:30 and is usually sold out of char kway teow by 1:30. We made the mistake of arriving at 2pm on our first visit. Don''t repeat it.
- **Cash only.** Small notes are appreciated.
- **Seating.** Three tables outside, two inside. It fills fast. You may share a table with strangers. That''s fine, they''ll probably tell you what else to order.
- **Kids.** The lorded pork rolls are genuinely popular with children. If yours eat noodles at home, they''ll eat here without complaint. The cendol is a guaranteed hit.
- **Noise and heat.** It''s a street kopitiam. The fan helps. Bring a handkerchief.

## How to Find It

Carnarvon Street, Georgetown, Penang. Walk south from the clan jetties until you smell charcoal and see plastic chairs. It will take roughly eight minutes on foot from most of the heritage quarter guesthouses.

It is not on Google Maps with any consistency. It doesn''t need to be.

---

*We paid for everything ourselves. No one knew we were writing this.*
$blog$,
  'https://images.unsplash.com/photo-1533050487297-09b450131914?w=1200&q=80',
  array['Malaysia','Penang','Food','Georgetown']::text[],
  'published',
  '2026-05-10'::timestamptz
) on conflict (slug) do nothing;
