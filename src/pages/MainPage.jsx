import { useState } from 'react'
import Header from '../components/shared/Header'
import PackageList from '../components/packages/PackageList'
import AddPackageModal from '../components/packages/AddPackageModal'
import IsraelPostModal from '../components/packages/IsraelPostModal'
import { useAuth } from '../contexts/AuthContext'
import { usePackages } from '../hooks/usePackages'

export default function MainPage() {
  const { user } = useAuth()
  const { packages } = usePackages(user?.uid)
  const [modalOpen, setModalOpen] = useState(false)
  const [israelPostOpen, setIsraelPostOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onAddPackage={() => setModalOpen(true)} onIsraelPostSync={() => setIsraelPostOpen(true)} />
      <main className="mx-auto max-w-7xl px-0 py-6">
        <PackageList />
      </main>
      {modalOpen && <AddPackageModal onClose={() => setModalOpen(false)} />}
      {israelPostOpen && (
        <IsraelPostModal
          onClose={() => setIsraelPostOpen(false)}
          existingPackages={packages}
        />
      )}
    </div>
  )
}
