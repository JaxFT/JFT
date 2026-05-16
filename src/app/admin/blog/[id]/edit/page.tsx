import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostById } from '@/lib/blog-db'
import EditForm from './EditForm'

export const metadata: Metadata = {
  title: 'Admin · Edit Post',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { id } = await params
  const { new: isNew } = await searchParams
  const post = await getPostById(id)
  if (!post) notFound()

  return <EditForm post={post} justCreated={isNew === '1'} />
}
