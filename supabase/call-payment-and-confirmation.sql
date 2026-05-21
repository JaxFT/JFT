-- Phase 2 of the 1:1 call feature:
--   - track whether a request has been paid for (Stripe webhook flips
--     paid_at after a successful checkout via the Payment Link)
--   - allow message rows to be structured (chat vs. confirmation)
--     so we can render the calendar card with a downloadable .ics

alter table public.call_requests
  add column if not exists paid_at timestamptz;

alter table public.call_request_messages
  add column if not exists kind     text not null default 'chat',
  add column if not exists metadata jsonb;

alter table public.call_request_messages
  drop constraint if exists call_request_messages_kind_check;
alter table public.call_request_messages
  add constraint call_request_messages_kind_check
  check (kind in ('chat', 'confirmation'));

create index if not exists call_request_messages_kind_idx
  on public.call_request_messages (call_request_id, kind);

-- Enable Realtime broadcasts on the messages table so the CallThread
-- component can subscribe and stream new replies live. RLS still
-- gates what each subscriber actually receives.
alter publication supabase_realtime add table public.call_request_messages;
