-- Adds "someone replied to your blog comment" as a fourth
-- notification type, alongside buddy_added / guestbook_comment /
-- recommendation_comment.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('buddy_added', 'guestbook_comment', 'recommendation_comment', 'blog_comment_reply'));
