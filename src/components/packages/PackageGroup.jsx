import { useState } from 'react'
import PackageCard from './PackageCard'

export default function PackageGroup({ location, address, openingTimes, packages }) {
  const [collapsed, setCollapsed] = useState(false)
  const sorted = [...packages].sort((a, b) => {
    if (a.status === 'picked' && b.status !== 'picked') return 1
    if (a.status !== 'picked' && b.status === 'picked') return -1
    return 0
  })
  const pendingCount = packages.filter((p) => p.status !== 'picked').length

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">📍</span>
        <h2 className="text-sm font-semibold text-slate-800">{location}</h2>
        <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 font-medium">
          {pendingCount > 0 ? `${pendingCount} / ${packages.length}` : packages.length}
        </span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <>
          {(address || openingTimes) && (
            <div className="ml-7 mb-3 space-y-0.5">
              {address && <p className="text-xs text-slate-500">{address}</p>}
              {openingTimes && <p className="text-xs text-slate-400">🕐 {openingTimes}</p>}
            </div>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3${address ? '' : ' mt-3'}`}>
            {sorted.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
