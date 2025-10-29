import { useInView } from '../../lib/animations';

const phases = [
  {
    title: 'Fase 1: Fundação',
    time: 'Mês 1-4',
    color: 'blue',
    features: [
      'Sistema de Temas',
      'Multi-tenancy',
      'Billing (Stripe)',
      'Templates de Agentes',
    ],
  },
  {
    title: 'Fase 2: Integrações',
    time: 'Mês 5-8',
    color: 'orange',
    features: [
      'WhatsApp Business',
      'Telegram Bot',
      'Slack Integration',
      'Analytics Dashboard',
    ],
  },
  {
    title: 'Fase 3: Escala',
    time: 'Mês 9-12',
    color: 'green',
    features: [
      'API Pública',
      'Onboarding Interativo',
      'Mobile App (beta)',
      'Expansão LATAM',
    ],
  },
];

export default function Roadmap() {
  const [ref, isInView] = useInView();

  return (
    <section id="roadmap" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Roadmap 12 Meses</h2>
        <p className="section-subtitle">
          O que está por vir na nossa plataforma
        </p>

        <div
          ref={ref as any}
          className={`flex flex-col md:flex-row items-center gap-8 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {phases.map((phase, index) => (
            <div key={index} className="flex-1 w-full">
              <div
                className="neon-card"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.6s ease-out',
                  transitionDelay: `${index * 0.2}s`,
                }}
              >
                <h3 className={`text-2xl font-bold mb-2 neon-text-${phase.color}`}>
                  {phase.title}
                </h3>
                <p className="text-gray-400 mb-6 text-sm">{phase.time}</p>

                {/* Features List */}
                <ul className="space-y-3">
                  {phase.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderLeft: '3px solid #ff6b00',
                      }}
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Arrow */}
              {index < phases.length - 1 && (
                <div className="hidden md:block text-center text-5xl neon-text-orange mt-8">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



