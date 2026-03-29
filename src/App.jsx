import { useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import LoadingSpinner from './components/shared/LoadingSpinner'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return user ? <MainPage /> : <AuthPage />
}
