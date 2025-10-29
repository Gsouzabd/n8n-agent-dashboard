import { useInView } from '../../lib/animations';

const checkpoints = [
  {
    time: 'Dia 1',
    title: 'Onboarding',
    description: 'Criar conta e primeiro agente',
    icon: '🚀',
  },
  {
    time: 'Semana 1',
    title: 'Configuração',
    description: 'Upload de documentos e personalização',
    icon: '⚙️',
  },
  {
    time: 'Mês 1',
    title: 'Go Live',
    description: 'Agente respondendo 24/7',
    icon: '✅',
  },
  {
    time: 'Mês 3',
    title: 'Otimização',
    description: 'Análise de métricas e ajustes',
    icon: '📊',
  },
  {
    time: 'Mês 6',
    title: 'Escala',
    description: 'Múltiplos agentes e integrações',
    icon: '🌟',
  },
];

export default function CustomerJourney() {
  const [ref, isInView] = useInView();

  return (
    <section id="customer-journey" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Jornada do Cliente</h2>
        <p className="section-subtitle">
          Do primeiro dia até o sucesso completo
        </p>

        <div
          ref={ref as any}
          className={`max-w-5xl mx-auto ${isInView ? 'animate-fade-in' : 'opacity-0'}`}
        >
          {/* Desktop: Horizontal */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Timeline Line */}
              <div
                className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2"
                style={{
                  background: 'linear-gradient(90deg, #ff6b00, #00d4ff)',
                  boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)',
                }}
              />

              {/* Checkpoints */}
              <div className="flex justify-between relative">
                {checkpoints.map((checkpoint, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center"
                    style={{
                      flex: 1,
                      opacity: isInView ? 1 : 0,
                      transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                      transition: 'all 0.6s ease-out',
                      transitionDelay: `${index * 0.15}s`,
                    }}
                  >
                    {/* Icon Circle */}
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 relative z-10"
                      style={{
                        background: 'var(--bg-card)',
                        border: '3px solid #ff6b00',
                        boxShadow: '0 0 30px rgba(255, 107, 0, 0.5)',
                      }}
                    >
                      {checkpoint.icon}
                    </div>

                    {/* Content */}
                    <div className="text-center max-w-[150px]">
                      <div className="text-sm text-gray-400 mb-2">
                        {checkpoint.time}
                      </div>
                      <h3 className="text-lg font-bold mb-1">
                        {checkpoint.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {checkpoint.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: Vertical */}
          <div className="md:hidden space-y-8">
            {checkpoints.map((checkpoint, index) => (
              <div
                key={index}
                className="flex items-start gap-4"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateX(0)' : 'translateX(-30px)',
                  transition: 'all 0.6s ease-out',
                  transitionDelay: `${index * 0.15}s`,
                }}
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    background: 'var(--bg-card)',
                    border: '2px solid #ff6b00',
                    boxShadow: '0 0 20px rgba(255, 107, 0, 0.5)',
                  }}
                >
                  {checkpoint.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="text-sm text-gray-400 mb-1">
                    {checkpoint.time}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{checkpoint.title}</h3>
                  <p className="text-gray-400">{checkpoint.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



