-- In-site notifications: new travel buddy, guestbook message, comment
-- on your recommendation. Deliberately no email — see conversation,
-- this is in-app only via a bell in the Navbar. Rows are always
-- written by the service role (the actor writing to the RECIPIENT's
-- row), never by the recipient's own client, so there's no insert
-- policy, only select + update-your-own-read-state.

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  actor_user_id   uuid references auth.users(id) on delete set null,
  type            text not null check (type in ('buddy_added', 'guestbook_comment', 'recommendation_comment')),
  message         text not null,
  link            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
