// Skeleton that mirrors the guides listing layout.

export default function GuidesLoading() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <div className="h-3 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="h-5 w-96 max-w-full bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
