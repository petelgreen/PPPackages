import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className
      )}
      {...props}
    />
  );
}

function fireConfetti() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  const randomInRange = (min, max) => Math.random() * (max - min) + min;
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function SignUpCard({ onSwitch }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      fireConfetti();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/40 via-blue-700/50 to-black" />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Glows */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-blue-400/20 blur-[80px]" />
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-blue-300/20 blur-[60px]"
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-blue-400/20 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
      />
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-xl relative z-10 flex flex-col items-center"
        style={{ perspective: 1500 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl mb-4 ring-1 ring-white/20">
            <span className="text-2xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PPickUp</h1>
          <p className="mt-1.5 text-sm text-blue-200">Track your packages using AI</p>
        </div>
        <motion.div
          className="relative w-full"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="relative group w-full">
            {/* Card glow */}
            <motion.div
              className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
              animate={{
                boxShadow: [
                  '0 0 10px 2px rgba(255,255,255,0.03)',
                  '0 0 15px 5px rgba(255,255,255,0.05)',
                  '0 0 10px 2px rgba(255,255,255,0.03)',
                ],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
            />

            {/* Traveling light beams */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                animate={{ left: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
                transition={{ left: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror' } }}
              />
              <motion.div
                className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                animate={{ top: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
                transition={{ top: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.6 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 } }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                animate={{ right: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
                transition={{ right: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.2 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 } }}
              />
              <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                animate={{ bottom: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3] }}
                transition={{ bottom: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.8 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 } }}
              />
              {[
                { className: 'absolute top-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]', delay: 0 },
                { className: 'absolute top-0 right-0 h-[8px] w-[8px] rounded-full bg-white/60 blur-[2px]', delay: 0.5 },
                { className: 'absolute bottom-0 right-0 h-[8px] w-[8px] rounded-full bg-white/60 blur-[2px]', delay: 1 },
                { className: 'absolute bottom-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]', delay: 1.5 },
              ].map((spot, i) => (
                <motion.div
                  key={i}
                  className={spot.className}
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2 + i * 0.1, repeat: Infinity, repeatType: 'mirror', delay: spot.delay }}
                />
              ))}
            </div>

            {/* Card border glow */}
            <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-white/3 via-white/7 to-white/3 opacity-0 group-hover:opacity-70 transition-opacity duration-500" />

            {/* Glass card */}
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                  backgroundSize: '30px 30px',
                }}
              />

              {/* Header */}
              <div className="text-center space-y-1 mb-5">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80"
                >
                  Create Account
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60 text-xs"
                >
                  Start tracking your packages with AI
                </motion.p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div className="space-y-3">
                  {/* Email */}
                  <motion.div
                    className={`relative ${focusedInput === 'email' ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-white/40'}`} />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        required
                        className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-white/10"
                      />
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    className={`relative ${focusedInput === 'password' ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-white/40'}`} />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        required
                        className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3">
                        {showPassword ? (
                          <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  {/* Confirm password */}
                  <motion.div
                    className={`relative ${focusedInput === 'confirm' ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === 'confirm' ? 'text-white' : 'text-white/40'}`} />
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onFocus={() => setFocusedInput('confirm')}
                        onBlur={() => setFocusedInput(null)}
                        required
                        className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3">
                        {showConfirm ? (
                          <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2"
                  >
                    <p className="text-xs text-red-400">{error}</p>
                  </motion.div>
                )}

                {/* Create account button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group/button mt-2"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />
                  <div className="relative overflow-hidden bg-white text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -z-10"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
                      style={{ opacity: isLoading ? 1 : 0, transition: 'opacity 0.3s ease' }}
                    />
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-sm font-medium">
                          Create Account
                          <UserPlus className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

                {/* Divider */}
                <div className="relative mt-2 mb-5 flex items-center">
                  <div className="flex-grow border-t border-white/5" />
                  <motion.span
                    className="mx-3 text-xs text-white/40"
                    animate={{ opacity: [0.7, 0.9, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    or
                  </motion.span>
                  <div className="flex-grow border-t border-white/5" />
                </div>

                {/* Google Sign Up */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full relative group/google"
                >
                  <div className="absolute inset-0 bg-white/5 rounded-lg blur opacity-0 group-hover/google:opacity-70 transition-opacity duration-300" />
                  <div className="relative overflow-hidden bg-white/5 text-white font-medium h-10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                    {isGoogleLoading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-white/80 group-hover/google:text-white transition-colors text-xs">
                          Sign up with Google
                        </span>
                      </>
                    )}
                  </div>
                </motion.button>

                {/* Sign in link */}
                <motion.p
                  className="text-center text-xs text-white/60 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitch}
                    className="relative inline-block text-white hover:text-white/70 transition-colors duration-300 font-medium underline-offset-2 hover:underline"
                  >
                    Sign in
                  </button>
                </motion.p>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
