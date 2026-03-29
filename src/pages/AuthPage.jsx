import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SignInCard } from '../components/ui/sign-in-card-2'
import { SignUpCard } from '../components/ui/sign-up-card'

export default function AuthPage() {
  const [mode, setMode] = useState('login')

  return (
    <AnimatePresence mode="wait">
      {mode === 'login' ? (
        <motion.div
          key="signin"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <SignInCard onSwitch={() => setMode('signup')} />
        </motion.div>
      ) : (
        <motion.div
          key="signup"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <SignUpCard onSwitch={() => setMode('login')} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
