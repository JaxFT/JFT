// Server-component wrapper that fetches the family-level data
// (children + visits) once and renders the four family-level
// sections in order: kid cards, home country, country visits, and
// (later phases) pack allocation + stamp award + permissions +
// delete. Lives in /account because that's where the family
// dashboard now sits.

import AdventurePassportSection from './AdventurePassportSection'
import HomeCountrySection from './HomeCountrySection'
import CountryVisitsSection from './CountryVisitsSection'
import StampAwardSection from './StampAwardSection'
import PackAllocationSection from './PackAllocationSection'
import DeletePassportSection from './DeletePassportSection'
import { listChildrenForParent, listFamilyCountryVisits } from '@/lib/passport-db'
import { PACK_META } from '@/lib/adventurePackMeta'
import { createClient } from '@/lib/supabase/server'

export default async function FamilyPassportSections({
  homeIso2,
}: {
  homeIso2: string | null
}) {
  const supabase = await createClient()
  const [children, visits] = await Promise.all([
    listChildrenForParent(),
    listFamilyCountryVisits(),
  ])

  // Packs already assigned to ANY child in the family — used by the
  // pack pre-allocation card to mark "Assigned" vs offer "Assign".
  const childIds = children.map(c => c.id)
  const { data: assignedRows } = childIds.length > 0
    ? await supabase
        .from('child_pack_assignments')
        .select('country_slug')
        .in('child_id', childIds)
    : { data: [] as Array<{ country_slug: string }> }
  const allocatedSlugs = Array.from(new Set(
    ((assignedRows ?? []) as Array<{ country_slug: string }>).map(r => r.country_slug),
  ))

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

      {children.length > 0 && (
        <div className="mb-6">
          <PackAllocationSection
            allPacks={PACK_META.map(p => ({
              slug: p.slug, country: p.country, flag: p.flag, iso2: p.iso2,
              status: p.status, continent: p.continent,
            }))}
            initialAllocatedSlugs={allocatedSlugs}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="mb-6">
          <StampAwardSection
            children={children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))}
            allPacks={PACK_META.map(p => ({ slug: p.slug, country: p.country, flag: p.flag }))}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="mb-6">
          <DeletePassportSection
            children={children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))}
          />
        </div>
      )}
    </>
  )
}
