import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import confetti from 'canvas-confetti'

export default function SignupForm({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      fireConfetti()
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 transition-all"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 transition-all"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 transition-all"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60 transition-colors mt-2"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
          Sign in
        </button>
      </p>
    </form>
  )
}

function fireConfetti() {
  const duration = 3 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  const randomInRange = (min, max) => Math.random() * (max - min) + min

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) return clearInterval(interval)

    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
