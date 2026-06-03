-- IP-keyed rate limit for /api/family-way/email-result.
--
-- The endpoint is open (a logged-out visitor finishes the calculator
-- and asks for the result by email), so without this anyone can POST
-- in a loop and burn Resend budget / spam arbitrary recipients via
-- our sending domain. We don't store raw IPs: only a SHA-256 hash
-- with a short application-specific prefix.
--
-- The route writes + reads this table with the service role; no
-- policies are needed because RLS denies everything else by default.

create table if not exists public.family_way_email_rate_limit (
  id      bigserial primary key,
  ip_hash text        not null,
  sent_at timestamptz not null default now()
);

create index if not exists family_way_email_rate_limit_ip_hash_idx
  on public.family_way_email_rate_limit (ip_hash, sent_at desc);

alter table public.family_way_email_rate_limit enable row level security;
