import { useInView } from '../../lib/animations';

const beforeItems = [
  { icon: '⏱️', label: '2-4 horas resposta' },
  { icon: '👤', label: '44h/semana' },
  { icon: '💸', label: 'R$ 2.500/mês' },
  { icon: '📉', label: '~50 msgs/dia' },
];

const afterItems = [
  { icon: '⚡', label: '2-5 segundos' },
  { icon: '🌙', label: '168h/semana (24/7)' },
  { icon: '💰', label: 'R$ 97/mês' },
  { icon: '🚀', label: 'Ilimitado' },
];

export default function Solution() {
  const [ref, isInView] = useInView();

  return (
    <section id="solution" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Nossa Solução</h2>
        <p className="section-subtitle">
          Transforme completamente sua operação de atendimento
        </p>

        <div
          ref={ref as any}
          className={`grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {/* ANTES */}
          <div className="neon-card">
            <h3 className="text-3xl font-bold neon-text-red text-center mb-6">
              ANTES
            </h3>
            <div className="space-y-4">
              {beforeItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="text-center">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ff6b00"
              strokeWidth="2"
              className="mx-auto transform rotate-90 md:rotate-0"
              style={{ filter: 'drop-shadow(0 0 15px rgba(255, 107, 0, 0.8))' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {/* DEPOIS */}
          <div className="neon-card green">
            <h3 className="text-3xl font-bold neon-text-green text-center mb-6">
              DEPOIS
            </h3>
            <div className="space-y-4">
              {afterItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ background: 'rgba(16, 185, 129, 0.05)' }}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-gray-300 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Video/Demo Placeholder */}
        <div
          className="mt-16 p-12 rounded-2xl text-center"
          style={{
            background: 'rgba(255, 107, 0, 0.05)',
            border: '1px solid rgba(255, 107, 0, 0.2)',
          }}
        >
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-2xl font-bold mb-4">Veja em Ação</h3>
          <p className="text-gray-400 mb-6">
            Demonstração de 5 minutos mostrando como configurar seu primeiro agente
          </p>
          <button className="neon-button neon-button-primary">
            ▶️ Assistir Demo
          </button>
        </div>
      </div>
    </section>
  );
}



