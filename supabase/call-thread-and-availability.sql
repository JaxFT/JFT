-- 1:1 call upgrade: per-user requests + day/time availability + a
-- two-way message thread between admin and the requesting user.
--
-- After running this:
--   - call_requests gains user_id, preferred_days, preferred_times
--   - new call_request_messages table for the back-and-forth thread
--   - RLS so a signed-in user only sees their own request + thread

-- ── EXTEND CALL_REQUESTS ─────────────
alter table public.call_requests
  add column if not exists user_id          uuid references auth.users(id) on delete set null,
  add column if not exists preferred_days   text[] not null default '{}',
  add column if not exists preferred_times  text[] not null default '{}';

create index if not exists call_requests_user_id_idx on public.call_requests (user_id);

-- Users can read their own call_requests row (so /account can show it).
drop policy if exists "call_requests_owner_select" on public.call_requests;
create policy "call_requests_owner_select" on public.call_requests
  for select using (user_id is not null and user_id = auth.uid());

-- ── MESSAGE THREAD ───────────────────
create table if not exists public.call_request_messages (
  id               uuid primary key default gen_random_uuid(),
  call_request_id  uuid not null references public.call_requests(id) on delete cascade,
  sender           text not null check (sender in ('admin','user')),
  body             text not null,
  created_at       timestamptz not null default now()
);

create index if not exists call_request_messages_request_idx
  on public.call_request_messages (call_request_id, created_at);

alter table public.call_request_messages enable row level security;

-- Owners (signed-in user attached to the call_request) can read the
-- thread for their own request.
drop policy if exists "call_request_messages_owner_select" on public.call_request_messages;
create policy "call_request_messages_owner_select" on public.call_request_messages
  for select using (
    exists (
      select 1 from public.call_requests cr
      where cr.id = call_request_id
        and cr.user_id is not null
        and cr.user_id = auth.uid()
    )
  );

-- Owners can post messages on their own request, but only as sender='user'.
drop policy if exists "call_request_messages_owner_insert" on public.call_request_messages;
create policy "call_request_messages_owner_insert" on public.call_request_messages
  for insert with check (
    sender = 'user'
    and exists (
      select 1 from public.call_requests cr
      where cr.id = call_request_id
        and cr.user_id is not null
        and cr.user_id = auth.uid()
    )
  );

-- Admins (email allowlist) can read + insert anything on the thread.
drop policy if exists "call_request_messages_admin_select" on public.call_request_messages;
create policy "call_request_messages_admin_select" on public.call_request_messages
  for select using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "call_request_messages_admin_insert" on public.call_request_messages;
create policy "call_request_messages_admin_insert" on public.call_request_messages
  for insert with check (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "call_request_messages_admin_delete" on public.call_request_messages;
create policy "call_request_messages_admin_delete" on public.call_request_messages
  for delete using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );
