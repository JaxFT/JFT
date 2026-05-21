-- Adds an explicit flag so a user can declare "my username IS my
-- Instagram handle" without sneaking a literal '@' into the username
-- text. When true, the UI renders the username with an '@' prefix
-- and links it to https://instagram.com/<username>.
--
-- Migration also strips any leading '@' from existing usernames and
-- flips the flag on, so users who previously typed '@jax.travels'
-- end up with username='jax.travels' + username_is_instagram=true.

alter table public.profiles
  add column if not exists username_is_instagram boolean not null default false;

update public.profiles
   set username = substring(username from 2),
       username_is_instagram = true
 where username is not null
   and left(username, 1) = '@';
