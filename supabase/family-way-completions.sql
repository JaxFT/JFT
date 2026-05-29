-- Pre-trip "Family Way" calculator completions.
--
-- One row per visitor who reaches the results screen of the /i-want-to-travel
-- questionnaire. Anonymous by default; user_id is set only when the visitor
-- happens to be logged in at the moment of completion (rare today, but cheap
-- to record and lets us join completions to accounts later if useful).
--
-- Insert path: /api/family-way/complete (service role, so RLS doesn't block).
-- Read path:  /api/admin/live-count (service role).

create table if not exists public.family_way_completions (
  id           uuid primary key default gen_random_uuid(),
  completed_at timestamptz not null default now(),
  score        integer,
  user_id      uuid references public.profiles(id) on delete set null
);

create index if not exists family_way_completions_completed_at_idx
  on public.family_way_completions(completed_at desc);

-- RLS on; the only writers/readers are server routes using the service
-- role, which bypasses RLS, so we don't need any policies. Belt-and-braces
-- against accidental anon SELECT/INSERT from client code in the future.
alter table public.family_way_completions enable row level security;
