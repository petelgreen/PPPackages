import { useState } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import StatusBadge from '../shared/StatusBadge'
import SourceBadge from '../shared/SourceBadge'
import { ButtonHoldAndRelease } from '@/components/ui/hold-and-release-button'

export default function PackageCard({ pkg }) {
  const [marking, setMarking] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function markAsPicked() {
    setMarking(true)
    try {
      await updateDoc(doc(db, 'packages', pkg.id), { status: 'picked' })
    } finally {
      setMarking(false)
    }
  }

  function handleDelete() {
    deleteDoc(doc(db, 'packages', pkg.id)).catch(console.error)
  }

  const isPicked = pkg.status === 'picked'
  const showDetails = expanded || hovered
  const hasDetails = pkg.arrivalDate || pkg.pickupCode || pkg.approvalLink || pkg.trackingLink

  return (
    <div
      className={`rounded-2xl border p-3.5 flex flex-col gap-2.5 transition-all duration-200 ${
        isPicked
          ? 'bg-slate-50 border-slate-100 opacity-55'
          : hovered
          ? 'bg-white border-indigo-200 shadow-md shadow-indigo-100/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon + name + status — tappable to expand details */}
      <button
        type="button"
        className={`flex items-start justify-between gap-2 w-full text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => hasDetails && setExpanded((v) => !v)}
        aria-expanded={showDetails}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className={`text-2xl leading-none ${isPicked ? 'grayscale' : ''}`}>{pkg.icon || '📦'}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isPicked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {pkg.name || 'Package'}
            </p>
            <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
              {pkg.trackingId || 'No tracking ID'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SourceBadge source={pkg.source} />
          <StatusBadge status={pkg.status} />
          {hasDetails && (
            <svg
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Carrier + added */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Carrier</p>
          <p className="text-slate-600 text-xs">{pkg.carrier || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Added</p>
          <p className="text-slate-600 text-xs">
            {pkg.createdAt?.toDate
              ? pkg.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
        </div>
      </div>

      {/* Expandable details — revealed by tap (mobile) or hover (desktop) */}
      {showDetails && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Arrival</p>
              <p className="text-slate-600 text-xs">{pkg.arrivalDate || '—'}</p>
            </div>
          </div>

          {(pkg.pickupCode || pkg.approvalLink || pkg.trackingLink) && (
            <div className="grid grid-cols-1 gap-y-1.5 border-t border-slate-100 pt-2.5">
              {pkg.pickupCode && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Pickup code</p>
                  <p className="text-slate-800 font-mono font-semibold text-sm bg-slate-50 rounded-lg px-2 py-1.5 inline-block tracking-widest">{pkg.pickupCode}</p>
                </div>
              )}
              {pkg.approvalLink && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Approval link</p>
                  <a
                    href={pkg.approvalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-600 hover:underline text-xs break-all transition-colors"
                  >
                    {pkg.approvalLink}
                  </a>
                </div>
              )}
              {pkg.trackingLink && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Tracking link</p>
                  <a
                    href={pkg.trackingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-600 hover:underline text-xs break-all transition-colors"
                  >
                    {pkg.trackingLink}
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      {pkg.status === 'pending' && (pkg.pickupLocation || pkg.isHomeDelivery) && (
        <button
          onClick={markAsPicked}
          disabled={marking}
          className="mt-0.5 w-full rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold py-3 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-60 transition-all min-h-[44px]"
        >
          {marking ? 'Updating…' : pkg.isHomeDelivery ? 'Mark as received' : 'Mark as picked up'}
        </button>
      )}
      <ButtonHoldAndRelease
        holdDuration={2000}
        onHoldComplete={handleDelete}
        className="w-full h-11 text-xs min-w-0"
      />
    </div>
  )
}
