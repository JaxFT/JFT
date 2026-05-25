-- Live-traffic counter for the admin card on /account.
-- Each browser tab writes a heartbeat to /api/heartbeat every 30s
-- with an anonymous session_id (sessionStorage UUID) and the current
-- pathname. The admin live-count endpoint reads back the count of
-- rows last seen in the past 60s.
--
-- No PII: just an opaque ID, the page they're on, and a timestamp.
-- Rows older than 5 minutes get swept on read so the table stays tiny.

create table if not exists live_sessions (
  session_id  text primary key,
  pathname    text not null,
  last_seen   timestamptz not null default now()
);

create index if not exists live_sessions_last_seen_idx
  on live_sessions (last_seen);

alter table live_sessions enable row level security;

-- No public policies. Writes and reads go through the service-role
-- key from server routes only. The public-facing heartbeat endpoint
-- validates and upserts via service role, never directly from the
-- browser session.
