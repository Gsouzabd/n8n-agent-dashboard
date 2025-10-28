'use client'

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, easeOut } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { Bot, MoveRight, Sparkles, UserPlus } from 'lucide-react'
import { SplineScene } from '@/components/ui/splite'

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signUp = useAuthStore((state) => state.signUp)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
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
        <div className="w-full lg:w-1/3 flex items-center justify-center p-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-2xl"
          >
            <motion.div variants={itemVariants} className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <UserPlus className="h-16 w-16 text-purple-600 dark:text-purple-400" />
                  <Sparkles className="h-6 w-6 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 bg-clip-text text-transparent">
                Criar Conta
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Comece a criar seus agentes de IA agora
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
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
                >
                  {loading ? (
                    <span>Criando conta...</span>
                  ) : (
                    <>
                      <span>Cadastrar</span>
                      <MoveRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={itemVariants} className="mt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium hover:underline"
                >
                  Entrar
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
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Crie Sua Conta
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Comece sua jornada com IA agora
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

