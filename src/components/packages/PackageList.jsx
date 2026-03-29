import { useMemo, useState, useRef, useEffect } from 'react'
import { usePackages } from '../../hooks/usePackages'
import { usePickupLocations } from '../../hooks/usePickupLocations'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { parseTrackingPage, buildTrackingLink, lookupLocationInfo } from '../../lib/openai'
import PackageGroup from './PackageGroup'
import PackageCard from './PackageCard'
import LoadingSpinner from '../shared/LoadingSpinner'
import { MorphingSquare } from '../ui/morphing-square'

const TABS = [
  { id: 'transit',  label: 'On the Way',     shortLabel: 'On the Way',   icon: '🚚' },
  { id: 'pickup',   label: 'Ready to Pick Up', shortLabel: 'Pick Up',     icon: '📍' },
  { id: 'home',     label: 'Home Delivery',   shortLabel: 'Home',        icon: '🏠' },
  { id: 'done',     label: 'Picked Up',       shortLabel: 'Done',        icon: '✅' },
]

export default function PackageList() {
  const { user } = useAuth()
  const { packages, loading, error } = usePackages(user?.uid)
  const pickupLocations = usePickupLocations(user?.uid)
  const [activeTab, setActiveTab] = useState('transit')
  const hasRefreshed = useRef(false)
  const hasEnriched = useRef(false)
  const [refreshingTracking, setRefreshingTracking] = useState(false)

  useEffect(() => {
    if (hasRefreshed.current || packages.length === 0) return
    hasRefreshed.current = true

    const pending = packages.filter(p => p.status === 'pending')

    // Packages that already have a tracking link
    const withLink = pending.filter(p => p.trackingLink)

    // Packages with no tracking link but we can build one from carrier + trackingId
    const needsLink = pending
      .filter(p => !p.trackingLink && p.carrier && p.trackingId)
      .map(p => ({ ...p, trackingLink: buildTrackingLink(p.carrier, p.trackingId) }))
      .filter(p => p.trackingLink)

    const toRefresh = [...withLink, ...needsLink]
    if (toRefresh.length === 0) return

    setRefreshingTracking(true)
    Promise.allSettled(toRefresh.map(async (pkg) => {
      try {
        const updates = {}

        // If we just built the tracking link, persist it first
        if (!pkg.trackingLink || needsLink.find(p => p.id === pkg.id)) {
          updates.trackingLink = pkg.trackingLink
        }

        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pkg.trackingLink)}`
        const res = await fetch(proxyUrl)
        if (res.ok) {
          const { contents: html } = await res.json()
          if (html) {
            const extracted = await parseTrackingPage(html)
            if (extracted.arrivalDate !== null) updates.arrivalDate = extracted.arrivalDate
            if (extracted.pickupLocation !== null) updates.pickupLocation = extracted.pickupLocation
            if (extracted.carrier !== null) updates.carrier = extracted.carrier
            if (extracted.status !== null) updates.status = extracted.status
            if (extracted.pickupCode !== null) updates.pickupCode = extracted.pickupCode
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'packages', pkg.id), updates)
        }
      } catch (_) {}
    })).finally(() => setRefreshingTracking(false))
  }, [packages])

  // Auto-enrich pickup locations missing address or opening times
  useEffect(() => {
    if (hasEnriched.current || packages.length === 0 || Object.keys(pickupLocations).length === 0) return
    hasEnriched.current = true

    const toEnrich = Object.entries(pickupLocations).filter(
      ([, loc]) => !loc.address || !loc.openingTimes
    )
    if (toEnrich.length === 0) return

    Promise.allSettled(toEnrich.map(async ([locationName, loc]) => {
      try {
        // Build context from packages at this location
        const pkgsHere = packages.filter(p => p.pickupLocation === locationName)
        const context = [
          pkgsHere[0]?.carrier,
          pkgsHere[0]?.rawMessage?.slice(0, 300),
        ].filter(Boolean).join('\n')

        const info = await lookupLocationInfo(locationName, context)
        const updates = {}
        if (!loc.address && info.address) updates.address = info.address
        if (!loc.openingTimes && info.openingTimes) updates.openingTimes = info.openingTimes
        if (Object.keys(updates).length === 0) return

        const locationId = btoa(loc.userId + '_' + locationName).replace(/[^a-zA-Z0-9]/g, '')
        await setDoc(doc(db, 'pickupLocations', locationId), updates, { merge: true })
      } catch (_) {}
    }))
  }, [packages, pickupLocations])

  const { inTransit, readyForPickup, homeDelivery, done, grouped } = useMemo(() => {
    const done = []
    const homeDelivery = []
    const inTransit = []
    const readyForPickup = []
    const grouped = {}

    for (const pkg of packages) {
      if (pkg.status === 'picked') {
        done.push(pkg)
      } else if (pkg.isHomeDelivery) {
        homeDelivery.push(pkg)
      } else if (!pkg.pickupLocation) {
        inTransit.push(pkg)
      } else {
        readyForPickup.push(pkg)
        if (!grouped[pkg.pickupLocation]) grouped[pkg.pickupLocation] = []
        grouped[pkg.pickupLocation].push(pkg)
      }
    }
    return { inTransit, readyForPickup, homeDelivery, done, grouped }
  }, [packages])

  const counts = {
    transit: inTransit.length,
    pickup:  readyForPickup.length,
    home:    homeDelivery.length,
    done:    done.length,
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-5 py-3">
          <p className="text-sm text-red-600">Error loading packages: {error}</p>
        </div>
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-base font-semibold text-slate-600">No packages yet</p>
        <p className="text-sm mt-1 text-slate-400">Click "Add Package" to add your first one.</p>
      </div>
    )
  }

  return (
    <>
      {/* Tracking refresh banner */}
      {refreshingTracking && (
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <MorphingSquare className="w-4 h-4 bg-indigo-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-700">Updating tracking info</p>
            <p className="text-[11px] text-indigo-400 mt-0.5">Fetching the latest delivery status…</p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="px-3 mb-5">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            const count = counts[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5
                  transition-all duration-200 min-h-[56px]
                  ${active
                    ? 'bg-white text-slate-800 shadow-sm shadow-slate-200/80'
                    : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <span className="relative inline-flex">
                  <span className="text-xl leading-none">{tab.icon}</span>
                  {count > 0 && (
                    <span className={`
                      absolute -top-1.5 -right-2.5 text-[9px] font-bold rounded-full
                      min-w-[15px] h-[15px] flex items-center justify-center px-0.5
                      ${active ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'}
                    `}>
                      {count}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-3">

        {/* ON THE WAY */}
        {activeTab === 'transit' && (
          inTransit.length === 0 ? (
            <EmptyState icon="🚚" message="No packages on the way" sub="Packages will appear here once shipped." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inTransit.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
            </div>
          )
        )}

        {/* PICKUP READY */}
        {activeTab === 'pickup' && (
          Object.keys(grouped).length === 0 ? (
            <EmptyState icon="📍" message="Nothing to pick up" sub="Packages ready at a pickup point will show here." />
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(grouped).map(([location, pkgs]) => (
                <PackageGroup
                  key={location}
                  location={location}
                  address={pickupLocations[location]?.address ?? pkgs.find((p) => p.address)?.address ?? null}
                  openingTimes={pickupLocations[location]?.openingTimes ?? null}
                  packages={pkgs}
                />
              ))}
            </div>
          )
        )}

        {/* HOME DELIVERY */}
        {activeTab === 'home' && (
          homeDelivery.length === 0 ? (
            <EmptyState icon="🏠" message="No home deliveries" sub="Packages being delivered to your door will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {homeDelivery.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
            </div>
          )
        )}

        {/* PICKED UP / DONE */}
        {activeTab === 'done' && (
          done.length === 0 ? (
            <EmptyState icon="✅" message="Nothing picked up yet" sub="Packages you've received will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {done.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
            </div>
          )
        )}

      </div>
    </>
  )
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm font-semibold text-slate-500">{message}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  )
}
