-- ═══════════════════════════════════════
--  JFT, Family-level country visits
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run; uses IF NOT EXISTS / ON CONFLICT throughout.
--
--  Country visits move from per-child (child_country_visits keyed
--  by child_id + pack slug) to per-family (family_country_visits
--  keyed by parent_id + ISO 3166-1 alpha-2 country code). Reasons:
--    1. A family travels together; one visit log shared across
--       every child in the family is closer to reality.
--    2. ISO codes let any country in the world be marked as
--       visited, not just the 35 Adventure Pack countries.
--
--  Backfills from the existing child_country_visits, mapping each
--  pack slug to its ISO code. The old table is kept for now as a
--  safety net; a follow-up migration will drop it once the new
--  code path has had a release in prod.
-- ═══════════════════════════════════════

-- 1. New table. Primary key = (parent_id, iso2) so the same
--    family can't have two rows for the same country.
create table if not exists public.family_country_visits (
  parent_id        uuid not null references auth.users(id) on delete cascade,
  iso2             char(2) not null,
  first_visit_date date not null default current_date,
  created_at       timestamptz not null default now(),
  primary key (parent_id, iso2)
);

create index if not exists fcv_parent_idx
  on public.family_country_visits (parent_id);

-- 2. Backfill from child_country_visits. Each child belongs to a
--    parent; we collapse all children's visits into one per-
--    parent list. If two children visited Japan, we keep the
--    earliest first_visit_date. Pack slug → iso2 mapping mirrors
--    the home-country migration; non-pack slugs (none should
--    exist today) are skipped.
insert into public.family_country_visits (parent_id, iso2, first_visit_date)
select
  c.parent_id,
  case ccv.country_slug
    when 'france'         then 'fr'
    when 'morocco'        then 'ma'
    when 'indonesia'      then 'id'
    when 'thailand'       then 'th'
    when 'malaysia'       then 'my'
    when 'spain'          then 'es'
    when 'portugal'       then 'pt'
    when 'united-kingdom' then 'gb'
    when 'japan'          then 'jp'
    when 'vietnam'        then 'vn'
    when 'cambodia'       then 'kh'
    when 'china'          then 'cn'
    when 'india'          then 'in'
    when 'sri-lanka'      then 'lk'
    when 'nepal'          then 'np'
    when 'turkey'         then 'tr'
    when 'egypt'          then 'eg'
    when 'australia'      then 'au'
    when 'new-zealand'    then 'nz'
    when 'canada'         then 'ca'
    when 'usa'            then 'us'
    when 'mexico'         then 'mx'
    when 'costa-rica'     then 'cr'
    when 'jamaica'        then 'jm'
    when 'brazil'         then 'br'
    when 'argentina'      then 'ar'
    when 'chile'          then 'cl'
    when 'germany'        then 'de'
    when 'belgium'        then 'be'
    when 'netherlands'    then 'nl'
    when 'uae'            then 'ae'
    when 'south-africa'   then 'za'
    when 'pakistan'       then 'pk'
    when 'bangladesh'     then 'bd'
    when 'laos'           then 'la'
    else null
  end as iso2,
  min(ccv.first_visit_date) as first_visit_date
from public.child_country_visits ccv
join public.children c on c.id = ccv.child_id
where ccv.country_slug is not null
group by c.parent_id, ccv.country_slug
having case ccv.country_slug
  when 'france' then 'fr' when 'morocco' then 'ma' when 'indonesia' then 'id'
  when 'thailand' then 'th' when 'malaysia' then 'my' when 'spain' then 'es'
  when 'portugal' then 'pt' when 'united-kingdom' then 'gb' when 'japan' then 'jp'
  when 'vietnam' then 'vn' when 'cambodia' then 'kh' when 'china' then 'cn'
  when 'india' then 'in' when 'sri-lanka' then 'lk' when 'nepal' then 'np'
  when 'turkey' then 'tr' when 'egypt' then 'eg' when 'australia' then 'au'
  when 'new-zealand' then 'nz' when 'canada' then 'ca' when 'usa' then 'us'
  when 'mexico' then 'mx' when 'costa-rica' then 'cr' when 'jamaica' then 'jm'
  when 'brazil' then 'br' when 'argentina' then 'ar' when 'chile' then 'cl'
  when 'germany' then 'de' when 'belgium' then 'be' when 'netherlands' then 'nl'
  when 'uae' then 'ae' when 'south-africa' then 'za' when 'pakistan' then 'pk'
  when 'bangladesh' then 'bd' when 'laos' then 'la'
  else null
end is not null
on conflict (parent_id, iso2) do update
  set first_visit_date = least(family_country_visits.first_visit_date, excluded.first_visit_date);

-- 3. Row-level security: each parent sees and edits only their own
--    family's visits.
alter table public.family_country_visits enable row level security;

drop policy if exists "fcv_parent_access" on public.family_country_visits;
create policy "fcv_parent_access" on public.family_country_visits
  for all using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- 4. Force PostgREST to pick up the new table immediately.
notify pgrst, 'reload schema';
