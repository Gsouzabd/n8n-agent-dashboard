'use client'

import { useEffect, useState, useRef, useId, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, LazyMotion, domAnimation } from 'framer-motion'
import { useOnClickOutside } from 'usehooks-ts'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Agent } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Layout } from '@/components/Layout'
// import { SplineScene } from '@/components/ui/splite' // Removido devido a erro 403
import { ChatDrawer } from '@/components/ChatDrawer'
import { useChatStore } from '@/stores/chatStore'
import { 
  Plus, 
  Bot, 
  Zap, 
  Brain, 
  Circle,
  CheckCircle2,
  MoreVertical,
  Edit,
  Settings,
  Trash2,
  Sparkles,
  Database,
  Activity,
  MessageSquare
} from 'lucide-react'

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

// Grid Pattern Component
interface GridPatternProps {
  width?: number
  height?: number
  x?: number
  y?: number
  squares?: Array<[x: number, y: number]>
  strokeDasharray?: string
  className?: string
  [key: string]: unknown
}

function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y], index) => (
            <rect
              strokeWidth="0"
              key={`${id}-square-${index}-${x}-${y}`}
              width={width - 1}
              height={height - 1}
              x={x * width + 1}
              y={y * height + 1}
            />
          ))}
        </svg>
      )}
    </svg>
  )
}

// Floating Button Components
type FloatingButtonProps = {
  className?: string
  children: ReactNode
  triggerContent: ReactNode
}

type FloatingButtonItemProps = {
  children: ReactNode
}

const list = {
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1
    }
  },
  hidden: {
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.1
    }
  }
}

const item = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 5 }
}

const btn = {
  visible: { rotate: '45deg' },
  hidden: { rotate: 0 }
}

function FloatingButton({ className, children, triggerContent }: FloatingButtonProps) {
  const ref = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  useOnClickOutside(ref, () => setIsOpen(false))

  return (
    <div className="flex flex-col items-center relative">
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.ul
            key="floating-menu"
            className="flex flex-col items-center absolute bottom-14 gap-2"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={list}>
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
      <motion.div
        variants={btn}
        animate={isOpen ? 'visible' : 'hidden'}
        ref={ref}
        onClick={() => setIsOpen(!isOpen)}>
        {triggerContent}
      </motion.div>
    </div>
  )
}

function FloatingButtonItem({ children, key }: FloatingButtonItemProps & { key?: string }) {
  return <motion.li variants={item}>{children}</motion.li>
}

// Empty State Component
const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: -6, transition: { duration: 0.4, delay: 0.1 } },
    hover: { x: -22, y: -5, rotate: -15, scale: 1.1, transition: { duration: 0.2 } }
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } }
  },
  right: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: 6, transition: { duration: 0.4, delay: 0.3 } },
    hover: { x: 22, y: -5, rotate: 15, scale: 1.1, transition: { duration: 0.2 } }
  }
}

const CONTENT_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
}

const BUTTON_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
}

const IconContainer = ({ children, variant, className = '' }: { children: ReactNode; variant: 'left' | 'center' | 'right'; className?: string }) => (
  <motion.div
    variants={ICON_VARIANTS[variant]}
    className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center relative shadow-lg transition-all duration-300",
      "bg-background border border-border group-hover:shadow-xl group-hover:border-primary/50",
      className
    )}
  >
    <div className="text-sm transition-colors duration-300 text-muted-foreground group-hover:text-foreground">
      {children}
    </div>
  </motion.div>
)

const MultiIconDisplay = ({ icons }: { icons: ReactNode[] }) => {
  if (!icons || icons.length < 3) return null

  return (
    <div className="flex justify-center isolate relative">
      <IconContainer variant="left" className="left-2 top-1 z-10">
        {icons[0]}
      </IconContainer>
      <IconContainer variant="center" className="z-20">
        {icons[1]}
      </IconContainer>
      <IconContainer variant="right" className="right-2 top-1 z-10">
        {icons[2]}
      </IconContainer>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icons: ReactNode[]
  action?: {
    label: string
    icon?: ReactNode
    onClick: () => void
  }
}

const EmptyState = ({ title, description, icons, action }: EmptyStateProps) => {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <LazyMotion features={domAnimation}>
      <motion.section
        role="region"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="group transition-all duration-300 rounded-xl relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[500px] bg-background border-dashed border-2 border-border hover:border-primary/50 hover:bg-accent/50"
        initial="initial"
        animate="animate"
        whileHover="hover"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-50 dark:opacity-35">
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Orbitando círculos animados */}
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 animate-spin" style={{ animationDuration: '20s' }}></div>
              <div className="absolute inset-4 rounded-full border-4 border-orange-400/30 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
              <div className="absolute inset-8 rounded-full border-4 border-orange-300/40 animate-spin" style={{ animationDuration: '10s' }}></div>
              {/* Núcleo central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background/90 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center p-12">
          <div className="mb-6">
            <MultiIconDisplay icons={icons} />
          </div>

          <motion.div variants={CONTENT_VARIANTS} className="space-y-2 mb-6">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {description}
              </p>
            )}
          </motion.div>

          {action && (
            <motion.div variants={BUTTON_VARIANTS}>
              <Button onClick={action.onClick} className="gap-2">
                {action.icon}
                <span>{action.label}</span>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.section>
    </LazyMotion>
  )
}

// Agent Card Component
function getRandomPattern(length?: number): [x: number, y: number][] {
  length = length ?? 5
  return Array.from({ length }, () => [
    Math.floor(Math.random() * 4) + 7,
    Math.floor(Math.random() * 6) + 1,
  ])
}

const AgentCard = ({ agent, onDelete }: { agent: Agent; onDelete: (id: string) => void }) => {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()
  const openChat = useChatStore((state) => state.openChat)

  // Determinar status baseado em webhook_url
  const status = agent.webhook_url ? 'active' : 'idle'

  const statusConfig = {
    active: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      label: 'Configurado'
    },
    idle: {
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      text: 'text-sky-600 dark:text-sky-400',
      icon: Circle,
      label: 'Pendente'
    }
  }

  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon

  return (
    <motion.div
      className="group relative isolate z-0 flex h-full flex-col justify-between overflow-hidden rounded-xl border border-gray-800 bg-black/90 backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white hover:border-orange-500/70 hover:shadow-2xl hover:shadow-orange-500/30"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated Grid Pattern Background */}
      <div className="absolute inset-0">
        <div className="absolute -inset-[25%] -skew-y-12 [mask-image:linear-gradient(225deg,black,transparent)]">
          <GridPattern
            width={30}
            height={30}
            x={0}
            y={0}
            squares={getRandomPattern(5)}
            className="fill-border/50 stroke-border absolute inset-0 size-full translate-y-2 transition-transform duration-150 ease-out group-hover:translate-y-0"
          />
        </div>
        <div className="absolute -inset-[10%] opacity-0 blur-[50px] transition-opacity duration-150 group-hover:opacity-10 bg-[conic-gradient(from_0deg,#3b82f6_0deg,#3b82f6_117deg,#9333ea_180deg,#3b82f6_240deg,#3b82f6_360deg)]" />
      </div>

      {/* Gradient Border Effect - Orange Glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-[-2px] rounded-xl bg-gradient-to-r from-orange-500/50 to-orange-600/50 blur-sm" />
      </div>

      {/* Glass Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30 group-hover:bg-orange-500/90 transition-colors"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Bot className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
            </motion.div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-gray-900 transition-colors">{agent.name}</h3>
              <div className={cn("flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-lg w-fit", statusInfo.bg)}>
                <StatusIcon className="w-3 h-3" strokeWidth={3} />
                <span className={cn("font-semibold", statusInfo.text)}>{statusInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 group-hover:text-gray-600 mb-4 flex-grow line-clamp-2 transition-colors">
          {agent.description || 'Sem descrição'}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-gray-600 mb-4 pb-4 border-b border-gray-800 group-hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{new Date(agent.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {agent.webhook_url && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">n8n</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 gap-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white group-hover:border-orange-600 group-hover:text-orange-600"
            onClick={() => openChat(agent)}
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/agents/${agent.id}/edit`)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate(`/agents/${agent.id}/knowledge`)}
          >
            <Database className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onDelete(agent.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// Main Component
export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      loadAgents()
    }
  }, [user])

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error('Erro ao carregar agentes:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAgent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAgents(agents.filter(agent => agent.id !== id))
    } catch (error) {
      console.error('Erro ao excluir agente:', error)
      alert('Erro ao excluir agente')
    }
  }

  const handleCreateAgent = () => {
    navigate('/agents/new')
  }

  return (
    <>
      <ChatDrawer />
    <Layout>
      {/* Animated Robot Background */}
      <div className="fixed top-0 right-0 w-2/3 h-screen opacity-40 dark:opacity-25 z-0 hidden lg:block pointer-events-none">
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative w-96 h-96">
            {/* Cabeça do robô */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-32 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-600/20 border-4 border-orange-500/40 animate-pulse">
              {/* Olhos */}
              <div className="absolute top-8 left-6 w-6 h-6 rounded-full bg-orange-500 animate-pulse"></div>
              <div className="absolute top-8 right-6 w-6 h-6 rounded-full bg-orange-500 animate-pulse"></div>
              {/* Boca */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full bg-orange-500/60"></div>
            </div>
            {/* Corpo */}
            <div className="absolute top-44 left-1/2 -translate-x-1/2 w-40 h-48 rounded-3xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-4 border-orange-500/30">
              {/* Detalhes do corpo */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-orange-500/40 animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>
            {/* Braços */}
            <div className="absolute top-48 left-4 w-16 h-6 rounded-full bg-gradient-to-r from-orange-500/30 to-transparent animate-pulse"></div>
            <div className="absolute top-48 right-4 w-16 h-6 rounded-full bg-gradient-to-l from-orange-500/30 to-transparent animate-pulse"></div>
            {/* Círculos orbitais */}
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/10 animate-spin" style={{ animationDuration: '30s' }}></div>
            <div className="absolute inset-8 rounded-full border-2 border-orange-400/15 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }}></div>
          </div>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Meus Agentes IA
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie e monitore seus agentes inteligentes
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onDelete={deleteAgent} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum Agente Criado"
            description="Crie seu primeiro agente de IA para automatizar tarefas, analisar dados ou gerar conteúdo. Comece clicando no botão abaixo."
            icons={[
              <Bot key="1" className="h-6 w-6" />,
              <Brain key="2" className="h-6 w-6" />,
              <Zap key="3" className="h-6 w-6" />
            ]}
            action={{
              label: "Criar Agente",
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreateAgent
            }}
          />
        )}

        {/* Floating Action Button */}
        {agents.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50">
            <FloatingButton
              triggerContent={
                <button className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/80 transition-all z-10 hover:scale-110">
                  <Plus className="w-6 h-6" />
                </button>
              }
            >
              <FloatingButtonItem key="fab-bot">
                <button 
                  onClick={handleCreateAgent}
                  className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/80 transition-all hover:scale-110"
                  title="Criar Agente Bot"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </FloatingButtonItem>
              <FloatingButtonItem key="fab-brain">
                <button 
                  onClick={handleCreateAgent}
                  className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-400/50 hover:shadow-xl hover:shadow-orange-400/80 transition-all hover:scale-110"
                  title="Criar Agente Inteligente"
                >
                  <Brain className="w-5 h-5" />
                </button>
              </FloatingButtonItem>
              <FloatingButtonItem key="fab-zap">
                <button 
                  onClick={handleCreateAgent}
                  className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/50 hover:shadow-xl hover:shadow-orange-600/80 transition-all hover:scale-110"
                  title="Criar Agente Rápido"
                >
                  <Zap className="w-5 h-5" />
                </button>
              </FloatingButtonItem>
            </FloatingButton>
          </div>
        )}
      </div>
    </Layout>
    </>
  )
}
