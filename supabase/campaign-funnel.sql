-- Self-serve short links for marketing campaigns (e.g. Instagram DMs
-- promoting a specific guide), plus a funnel_events log so we can see
-- click -> guide page view -> buy click -> purchase per campaign.
--
-- Both tables are service-role only (RLS enabled, no policies added),
-- read/written exclusively from server-side route handlers using the
-- admin client, same pattern as purchases/webhook code elsewhere.
-- Nothing here is meant to be readable by anon/authenticated directly.

create table if not exists public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  guide_slug text not null,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.campaign_links enable row level security;

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null,
  guide_slug text not null,
  event_type text not null check (event_type in ('click', 'view', 'buy_click', 'purchase')),
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_campaign_idx on public.funnel_events (campaign_code, event_type);

alter table public.funnel_events enable row level security;
