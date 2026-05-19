-- Switch the kid's "home country" from a pack slug to an ISO 3166-1
-- alpha-2 code so families living in any country (not just one of
-- our 35 Adventure Pack countries) can record it.
--
-- We add a new home_country_iso2 column, backfill it from the old
-- home_country_slug for the 35 pack slugs we know about, and drop
-- the old column. Old code paths that referenced home_country_slug
-- are migrated alongside this in the same release.

alter table children
  add column if not exists home_country_iso2 char(2);

-- Backfill: every existing home_country_slug → its iso2 counterpart
-- from the pack registry. Any slug we don't recognise gets nulled
-- (safer than guessing; the parent can re-pick on the new picker).
update children set home_country_iso2 = case home_country_slug
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
end
where home_country_slug is not null
  and home_country_iso2 is null;

alter table children
  drop column if exists home_country_slug;
