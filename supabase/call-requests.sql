-- ═══════════════════════════════════════
--  JFT — CALL REQUESTS (Supabase)
--  Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════

create table if not exists public.call_requests (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  family_situation   text,
  where_now          text,
  journey_stage      text check (journey_stage in ('dreaming','planning','soon','already')),
  what_to_discuss    text not null,
  timezone           text,
  status             text not null default 'new'
                     check (status in ('new','replied','scheduled','completed','declined')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists call_requests_updated_at on public.call_requests;
create trigger call_requests_updated_at before update on public.call_requests
  for each row execute procedure public.set_updated_at();

create index if not exists call_requests_status_idx on public.call_requests (status);
create index if not exists call_requests_created_at_idx on public.call_requests (created_at desc);

-- ── ROW LEVEL SECURITY ────────────────
-- Default-deny. The public form INSERTS via a server API route that
-- uses the service-role key (which bypasses RLS), so no public insert
-- policy needed. Admins read/update/delete via email allowlist.
alter table public.call_requests enable row level security;

drop policy if exists "call_requests_admin_select" on public.call_requests;
create policy "call_requests_admin_select" on public.call_requests
  for select using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "call_requests_admin_update" on public.call_requests;
create policy "call_requests_admin_update" on public.call_requests
  for update using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "call_requests_admin_delete" on public.call_requests;
create policy "call_requests_admin_delete" on public.call_requests
  for delete using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );
