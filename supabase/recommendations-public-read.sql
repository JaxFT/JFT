-- Recommendations become browsable without an account, matching
-- /discover. Writing (add/edit/delete/vote/comment) still requires
-- sign-in, unchanged by this file — only the three SELECT policies
-- move from "signed-in only" to public.

drop policy if exists "recommendations_select" on public.recommendations;
create policy "recommendations_select" on public.recommendations
  for select using (true);

drop policy if exists "recommendation_votes_select" on public.recommendation_votes;
create policy "recommendation_votes_select" on public.recommendation_votes
  for select using (true);

drop policy if exists "recommendation_comments_select" on public.recommendation_comments;
create policy "recommendation_comments_select" on public.recommendation_comments
  for select using (true);
