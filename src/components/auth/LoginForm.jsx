import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'

export default function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
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
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-slate-500">
        No account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
          Sign up
        </button>
      </p>
    </form>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
