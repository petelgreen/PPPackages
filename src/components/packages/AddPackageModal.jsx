import { useState } from 'react'
import { collection, addDoc, updateDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useOpenAI } from '../../hooks/useOpenAI'
import { suggestIcon } from '../../lib/openai'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function AddPackageModal({ onClose }) {
  const { user } = useAuth()
  const { extract, loading: extracting, error: extractError } = useOpenAI()

  const [step, setStep] = useState('input') // 'input' | 'confirm'
  const [showAdditional, setShowAdditional] = useState(false)
  const [rawMessage, setRawMessage] = useState('')
  const [fields, setFields] = useState({
    name: '',
    icon: '📦',
    trackingId: '',
    pickupLocation: '',
    address: '',
    openingTimes: '',
    carrier: '',
    arrivalDate: '',
    approvalLink: '',
    trackingLink: '',
    pickupCode: '',
    isHomeDelivery: false,
  })
  async function handleExtract(e) {
    e.preventDefault()
    if (!rawMessage.trim()) return
    const result = await extract(rawMessage)
    if (result) {
      setFields({
        name: result.name || '',
        icon: '📦',
        trackingId: result.trackingId || '',
        pickupLocation: result.pickupLocation || '',
        address: result.address || '',
        openingTimes: result.openingTimes || '',
        carrier: result.carrier || '',
        arrivalDate: result.arrivalDate || '',
        approvalLink: result.approvalLink || '',
        trackingLink: result.trackingLink || '',
        pickupCode: result.pickupCode || '',
        isHomeDelivery: result.isHomeDelivery || false,
      })
      setStep('confirm')
    }
  }

  function handleSave(e) {
    e.preventDefault()
    onClose()
    const name = fields.name || 'Package'

    // Upsert location info to the pickupLocations collection (keyed per user+location)
    if (fields.pickupLocation && (fields.openingTimes || fields.address)) {
      const locationId = btoa(user.uid + '_' + fields.pickupLocation).replace(/[^a-zA-Z0-9]/g, '')
      const locationData = { userId: user.uid, locationName: fields.pickupLocation }
      if (fields.openingTimes) locationData.openingTimes = fields.openingTimes
      if (fields.address) locationData.address = fields.address
      setDoc(
        doc(db, 'pickupLocations', locationId),
        locationData,
        { merge: true }
      ).catch(console.error)
    }

    addDoc(collection(db, 'packages'), {
      userId: user.uid,
      name,
      icon: '📦',
      trackingId: fields.trackingId || null,
      pickupLocation: fields.pickupLocation || null,
      address: fields.address || null,
      carrier: fields.carrier || null,
      arrivalDate: fields.arrivalDate || null,
      approvalLink: fields.approvalLink || null,
      trackingLink: fields.trackingLink || null,
      pickupCode: fields.pickupCode || null,
      isHomeDelivery: fields.isHomeDelivery || false,
      status: 'pending',
      source: null,
      rawMessage,
      createdAt: serverTimestamp(),
    }).then((docRef) => {
      // Auto-update icon with AI suggestion after save
      suggestIcon(name).then((icon) => {
        if (icon && icon !== '📦') {
          updateDoc(docRef, { icon }).catch(() => {})
        }
      }).catch(() => {})
    }).catch((err) => {
      console.error('Failed to save package:', err)
    })
  }

  function handleFieldChange(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const inputClass = "w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {step === 'input' ? 'Paste delivery message' : 'Confirm package details'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <form onSubmit={handleExtract} className="p-6 space-y-4">
            {extracting ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-semibold text-slate-700">Extracting package info with AI…</p>
                <p className="text-xs text-slate-400">This usually takes a few seconds</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Paste the SMS, email, or notification you received about your package. AI will extract the details.
                </p>
                <textarea
                  rows={6}
                  required
                  value={rawMessage}
                  onChange={(e) => setRawMessage(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 resize-none transition-all"
                  placeholder="e.g. Your package #1Z999AA10123456784 from Amazon has arrived at the front desk. Please pick it up by Dec 15."
                />
                {extractError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
                    <p className="text-sm text-red-600">{extractError}</p>
                  </div>
                )}
              </>
            )}
            {!extracting && (
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
                  disabled={!rawMessage.trim()}
                  className="flex-1 rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  Extract with AI
                </button>
              </div>
            )}
          </form>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Icon + Name row */}
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100">
              <div className="text-4xl leading-none">{fields.icon || '📦'}</div>
              <div className="flex-1 min-w-0">
                <label className={labelClass}>Package name</label>
                <input
                  type="text"
                  value={fields.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Nike Shoes"
                />
              </div>
            </div>

            {[
              { key: 'trackingId', label: 'Tracking ID' },
              { key: 'pickupLocation', label: 'Pickup location' },
              { key: 'address', label: 'Address' },
              { key: 'openingTimes', label: 'Opening hours' },
              { key: 'carrier', label: 'Carrier / Sender' },
              { key: 'arrivalDate', label: 'Arrival date (YYYY-MM-DD)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  type="text"
                  value={fields[key]}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}

            {/* Additional info collapsible */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdditional((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
              >
                <span>Additional info</span>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showAdditional ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showAdditional && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/50">
                  {[
                    { key: 'trackingLink', label: 'Tracking link' },
                    { key: 'approvalLink', label: 'Approval link' },
                    { key: 'pickupCode', label: 'Pickup code / PIN' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>
                      <input
                        type="text"
                        value={fields[key]}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setStep('input'); setShowAdditional(false) }}
                className="flex-1 rounded-xl border border-slate-200 text-slate-600 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Save package
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
