// Server-component wrapper that fetches the family-level data
// (children + visits) once and renders the four family-level
// sections in order: kid cards, home country, country visits, and
// (later phases) pack allocation + stamp award + permissions +
// delete. Lives in /account because that's where the family
// dashboard now sits.

import AdventurePassportSection from './AdventurePassportSection'
import HomeCountrySection from './HomeCountrySection'
import CountryVisitsSection from './CountryVisitsSection'
import { listChildrenForParent, listFamilyCountryVisits } from '@/lib/passport-db'

export default async function FamilyPassportSections({
  homeIso2,
}: {
  homeIso2: string | null
}) {
  const [children, visits] = await Promise.all([
    listChildrenForParent(),
    listFamilyCountryVisits(),
  ])

  // The CountryVisits API URL still includes a child id for path
  // compat; we pick the first child as the scope. If the family has
  // no children yet, hide the visits section — it has nothing to
  // attach to.
  const scopeChildId = children[0]?.id ?? null

  return (
    <>
      <div className="mb-6">
        <AdventurePassportSection />
      </div>

      <div className="mb-6">
        <HomeCountrySection initialHomeIso2={homeIso2} />
      </div>

      {scopeChildId && (
        <div className="mb-6">
          <CountryVisitsSection
            scopeChildId={scopeChildId}
            initialVisits={visits}
          />
        </div>
      )}
    </>
  )
}
