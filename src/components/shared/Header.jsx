import { useRef } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import TextCursorProximity from '@/components/ui/text-cursor-proximity'
import { SyncPackagesButton } from '@/components/ui/sync-packages-button'

export default function Header({ onAddPackage, onIsraelPostSync }) {
  const headerRef = useRef(null)

  return (
    <header className="bg-slate-900 text-white shadow-sm border-b border-white/5" ref={headerRef}>
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-500/20 rounded-lg">
            <span className="text-lg leading-none">📦</span>
          </div>
          <h1 className="text-2xl font-black tracking-widest">
            <TextCursorProximity
              label="PPickUp"
              containerRef={headerRef}
              radius={100}
              falloff="gaussian"
              styles={{
                color: { from: '#c7d2fe', to: '#fde68a' },
                transform: { from: 'scale(1) translateY(0px)', to: 'scale(1.5) translateY(-4px)' },
                filter: { from: 'drop-shadow(0 0 0px #fde68a)', to: 'drop-shadow(0 0 8px #fbbf24)' },
              }}
            />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddPackage}
            className="rounded-xl bg-indigo-500 text-white px-3 py-2.5 sm:px-4 text-sm font-semibold hover:bg-indigo-400 transition-colors min-h-[44px] flex items-center"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ Add Package</span>
          </button>
          <SyncPackagesButton onSelect={(id) => { if (id === 'israel-post') onIsraelPostSync() }} />
          <button
            onClick={() => signOut(auth)}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] flex items-center"
          >
            <span className="sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
