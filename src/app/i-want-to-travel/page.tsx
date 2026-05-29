import type { Metadata } from 'next'
import { FAMILY_WAY_HTML } from './family-way'
import FamilyWayCompletionTracker from './FamilyWayCompletionTracker'
import EmailResultModal from './EmailResultModal'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'I Want To Travel',
  description: 'A decision tool that tells you honestly whether long-term family travel is realistic for your family, right now.',
}

// The questionnaire is purely client-side (no backend), so there's no
// good reason to gate it behind sign-in. Every visitor lands straight
// on the iframe — the link from /work-with-us now reliably shows the
// quiz instead of bouncing to a marketing page.
export default async function IWantToTravelPage() {
  const user = await getCurrentUser()
  const initialUser = user?.email
    ? { id: user.id, email: user.email }
    : null
  return (
    <div className="pt-16 bg-sand-50">
      <FamilyWayCompletionTracker />
      <EmailResultModal initialUser={initialUser} />
      <iframe
        srcDoc={FAMILY_WAY_HTML}
        title="Family Way questionnaire"
        className="w-full border-0 block"
        style={{ height: 'calc(100vh - 4rem)' }}
      />
    </div>
  )
}
