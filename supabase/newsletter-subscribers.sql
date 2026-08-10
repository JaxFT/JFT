-- Lightweight, no-account email capture. Separate from `profiles`
-- because these people never sign up, they just hand over an email at
-- the end of a blog post or in the footer. If they later create a
-- real account with the same email, the two stay independent, this
-- table is purely a mailing list.
--
-- unsubscribed_at is set (not deleted) so a re-subscribe with the same
-- email is a simple null-out rather than a fresh insert racing the
-- unique constraint, and so we keep a record of prior consent history.

create table if not exists public.newsletter_subscribers (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null unique,
  source          text        not null,          -- 'blog_end' | 'footer' | ...
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_subscribers_email_idx
  on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;
-- No policies: the subscribe/unsubscribe routes use the service role
-- and RLS denies everything else by default (anon/authenticated get
-- no direct access to the list).

-- IP-keyed rate limit for POST /api/newsletter/subscribe, same pattern
-- as family_way_email_rate_limit, the endpoint is open to anyone and
-- triggers an outbound email, so it needs its own abuse guard.
create table if not exists public.newsletter_subscribe_rate_limit (
  id      bigserial   primary key,
  ip_hash text        not null,
  sent_at timestamptz not null default now()
);

create index if not exists newsletter_subscribe_rate_limit_ip_hash_idx
  on public.newsletter_subscribe_rate_limit (ip_hash, sent_at desc);

alter table public.newsletter_subscribe_rate_limit enable row level security;
