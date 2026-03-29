import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { suggestIcon } from '../../lib/openai'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function IsraelPostModal({ onClose, existingPackages = [] }) {
  const { user } = useAuth()
  const [step, setStep] = useState('loading') // 'loading' | 'login' | 'review' | 'done'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [parcels, setParcels] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  // On open, try to fetch packages with existing session
  useEffect(() => {
    async function tryExistingSession() {
      try {
        const res = await fetch('/api/israelpost/packages', {
          headers: { 'x-user-id': user.uid },
        })
        const data = await res.json()
        if (data.code === 'NOT_LOGGED_IN' || res.status === 401) {
          setStep('login')
          return
        }
        if (!res.ok) {
          setStep('login')
          return
        }
        loadParcels(data.parcels || [])
      } catch {
        setStep('login')
      }
    }
    tryExistingSession()
  }, [])

  function loadParcels(fetchedParcels) {
    setParcels(fetchedParcels)
    // Pre-select all
    setSelected(new Set(fetchedParcels.map((p) => p.israelPostId).filter(Boolean)))
    setStep('review')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const loginRes = await fetch('/api/israelpost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, userId: user.uid }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) {
        setLoginError(loginData.error || 'Login failed')
        setLoginLoading(false)
        return
      }
      // Now fetch packages
      const pkgRes = await fetch('/api/israelpost/packages', {
        headers: { 'x-user-id': user.uid },
      })
      const pkgData = await pkgRes.json()
      if (!pkgRes.ok) {
        setLoginError(pkgData.error || 'Could not fetch packages')
        setLoginLoading(false)
        return
      }
      loadParcels(pkgData.parcels || [])
    } catch {
      setLoginError('Connection error. Is the server running?')
    } finally {
      setLoginLoading(false)
    }
  }

  function toggleParcel(israelPostId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(israelPostId)) next.delete(israelPostId)
      else next.add(israelPostId)
      return next
    })
  }

  async function handleSync() {
    setSyncing(true)
    let added = 0
    let updated = 0

    const selectedParcels = parcels.filter((p) => selected.has(p.israelPostId))

    for (const parcel of selectedParcels) {
      const existing = existingPackages.find(
        (p) => p.israelPostId && p.israelPostId === parcel.israelPostId
      )

      if (existing) {
        // Update status/tracking fields only
        await updateDoc(doc(db, 'packages', existing.id), {
          status: parcel.status,
          arrivalDate: parcel.arrivalDate,
          pickupLocation: parcel.pickupLocation,
          address: parcel.address,
        }).catch(console.error)
        updated++
      } else {
        // Add new package
        const docRef = await addDoc(collection(db, 'packages'), {
          userId: user.uid,
          name: parcel.name,
          icon: parcel.icon,
          trackingId: parcel.trackingId || null,
          israelPostId: parcel.israelPostId || null,
          pickupLocation: parcel.pickupLocation || null,
          address: parcel.address || null,
          carrier: parcel.carrier || null,
          arrivalDate: parcel.arrivalDate || null,
          approvalLink: null,
          trackingLink: null,
          pickupCode: null,
          isHomeDelivery: parcel.isHomeDelivery || false,
          status: parcel.status || 'pending',
          source: 'israelPost',
          rawMessage: '',
          createdAt: serverTimestamp(),
        }).catch(console.error)

        if (docRef) {
          suggestIcon(parcel.name).then((icon) => {
            if (icon && icon !== '📦' && icon !== '📮') {
              updateDoc(docRef, { icon }).catch(() => {})
            }
          }).catch(() => {})
          added++
        }
      }
    }

    setSyncResult({ added, updated })
    setSyncing(false)
    setTimeout(onClose, 1800)
  }

  // Compute new vs existing counts
  const newCount = parcels.filter(
    (p) => !existingPackages.find((e) => e.israelPostId && e.israelPostId === p.israelPostId)
  ).length
  const existingCount = parcels.length - newCount

  const selectedCount = parcels.filter((p) => selected.has(p.israelPostId)).length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span>📮</span>
            {step === 'login' ? 'Connect to Israel Post' : step === 'review' ? 'Israel Post Packages' : 'Loading…'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Step: loading (trying existing session) */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-semibold text-slate-700">Connecting to Israel Post…</p>
          </div>
        )}

        {/* Step: login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-semibold text-slate-700">Signing in to Israel Post…</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Sign in with your Israel Post account to import your packages.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all"
                    placeholder="your@email.com"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                {loginError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
                    <p className="text-sm text-red-600">{loginError}</p>
                  </div>
                )}
              </>
            )}
            {!loginLoading && (
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 text-slate-600 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!username.trim() || !password.trim()}
                  className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  Sign in
                </button>
              </div>
            )}
          </form>
        )}

        {/* Step: review */}
        {step === 'review' && (
          <div className="p-6 space-y-4">
            {syncResult ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl">✓</span>
                <p className="text-sm font-semibold text-slate-700">
                  {syncResult.added} added · {syncResult.updated} updated
                </p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                    {newCount} new
                  </span>
                  {existingCount > 0 && (
                    <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                      {existingCount} will be updated
                    </span>
                  )}
                </div>

                {parcels.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No packages found in your Israel Post account.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {parcels.map((p) => {
                      const isExisting = existingPackages.find(
                        (e) => e.israelPostId && e.israelPostId === p.israelPostId
                      )
                      const isSelected = selected.has(p.israelPostId)
                      return (
                        <label
                          key={p.israelPostId || p.trackingId}
                          className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-slate-200 bg-white opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParcel(p.israelPostId)}
                            className="accent-blue-600 w-4 h-4 shrink-0"
                          />
                          <span className="text-xl leading-none">{p.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">{p.trackingId || '—'}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isExisting && (
                              <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">update</span>
                            )}
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              p.status === 'picked'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'in-transit'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                {syncing && (
                  <div className="flex items-center justify-center gap-2 py-2 text-slate-500">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">Syncing…</span>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 text-slate-600 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing || selectedCount === 0}
                    className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {syncing ? 'Syncing…' : `Sync ${selectedCount} package${selectedCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
