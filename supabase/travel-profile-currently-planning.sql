-- "Currently planning" status, shown prominently on the public Travel
-- Profile as a prompt for guestbook visitors to leave trip tips —
-- gives people something concrete to comment about instead of just
-- "nice profile!".

alter table public.travel_profiles
  add column if not exists currently_planning text;
