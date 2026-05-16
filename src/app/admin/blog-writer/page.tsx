import { redirect } from 'next/navigation'

export default function BlogWriterRedirectPage() {
  // Old iframe-based writer is gone. New flow lives at /admin/blog/draft.
  redirect('/admin/blog/draft')
}
