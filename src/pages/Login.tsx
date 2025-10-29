'use client'

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, easeOut } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { Bot, MoveRight, Sparkles, Zap } from 'lucide-react'
import { SpotlightInteractive } from '@/components/ui/spotlight-interactive'
import { SplineScene } from '@/components/ui/splite'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore((state) => state.signIn)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: easeOut },
    },
  }

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98 },
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-gray-50 to-orange-100/50 dark:from-black dark:via-gray-950 dark:to-gray-900 relative overflow-hidden">
      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/3 flex items-center justify-center p-4 relative z-10" style={{ left: '10%' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border border-orange-200/50 dark:border-orange-500/40 rounded-3xl p-8 shadow-2xl shadow-orange-500/20 dark:shadow-orange-500/60 relative hover:border-orange-400/70 dark:hover:border-orange-400/70 transition-all duration-300"
          >
            <SpotlightInteractive size={40} className="from-blue-500 via-purple-500 to-pink-500" />
            <motion.div variants={itemVariants} className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Bot className="h-16 w-16 text-primary" />
                  <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 bg-clip-text text-transparent">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Entre para gerenciar seus agentes de IA
              </p>
            </motion.div>

            <form onSubmit={handleSubmit}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-6 border border-red-200 dark:border-red-800"
                >
                  {error}
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-6">
                       <motion.button
                         type="submit"
                         variants={buttonVariants}
                         whileHover="hover"
                         whileTap="tap"
                         disabled={loading}
                         className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/50 hover:shadow-orange-500/80 hover:scale-[1.02]"
                       >
                  {loading ? (
                    <span>Entrando...</span>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <MoveRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={itemVariants} className="mt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Não tem uma conta?{' '}
                       <Link
                         to="/register"
                         className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium hover:underline"
                       >
                  Cadastre-se
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
        </div>

        {/* Right Side - 3D Robot Interactive */}
        <div className="hidden lg:flex lg:w-2/3 relative items-center justify-center">
          {/* Robot Spline */}
          <div className="absolute inset-0">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
          
          {/* Optional: Texto sobreposto */}
          <div className="relative z-10 text-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="bg-white/10 dark:bg-slate-900/30 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-slate-700/50"
            >
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                Bem-vindo ao Venturize Agents Workspace
              </h2>
              <p className="text-orange-600 dark:text-orange-400 text-lg font-medium">
                Inteligência Artificial ao seu alcance
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

