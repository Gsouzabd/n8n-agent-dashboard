import { useInView } from '../../lib/animations';

const competitors = [
  {
    name: 'VS Intercom',
    comparisons: [
      { text: '3x mais barato', positive: true },
      { text: 'Interface PT-BR', positive: true },
      { text: 'White-label', positive: true },
      { text: 'Menos integrações', positive: false },
    ],
    pricing: '$299/mês vs R$ 97/mês',
  },
  {
    name: 'VS ManyChat',
    comparisons: [
      { text: 'IA avançada (RAG)', positive: true },
      { text: 'Múltiplos canais', positive: true },
      { text: 'Base conhecimento', positive: true },
      { text: 'Sem flow builder', positive: false },
    ],
    pricing: '$15/mês vs R$ 97/mês',
  },
  {
    name: 'VS Crisp',
    comparisons: [
      { text: 'RAG nativo', positive: true },
      { text: 'Mais canais', positive: true },
      { text: 'Analytics robusto', positive: true },
      { text: 'Interface menos polida', positive: false },
    ],
    pricing: '€25/mês vs R$ 97/mês',
  },
];

export default function Differentiation() {
  const [ref, isInView] = useInView();

  return (
    <section id="differentiation" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Diferenciação Competitiva</h2>
        <p className="section-subtitle">
          Por que escolher nossa plataforma
        </p>

        <div
          ref={ref as any}
          className={`grid md:grid-cols-3 gap-6 mb-12 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {competitors.map((competitor, index) => (
            <div
              key={index}
              className="neon-card"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              <h3 className="text-2xl font-bold mb-6 text-center">
                {competitor.name}
              </h3>

              {/* Comparisons */}
              <div className="space-y-3 mb-6">
                {competitor.comparisons.map((comp, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      comp.positive
                        ? 'bg-green-500/10 border-l-3 border-green-500'
                        : 'bg-red-500/10 border-l-3 border-red-500'
                    }`}
                    style={{
                      borderLeft: `3px solid ${comp.positive ? '#10b981' : '#ef4444'}`,
                    }}
                  >
                    <span className="mr-2">{comp.positive ? '✅' : '❌'}</span>
                    {comp.text}
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="text-center text-sm font-semibold text-gray-400 border-t border-gray-700 pt-4">
                {competitor.pricing}
              </div>
            </div>
          ))}
        </div>

        {/* Our Position */}
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: 'rgba(255, 107, 0, 0.1)',
            border: '2px solid #ff6b00',
          }}
        >
          <h3 className="text-3xl font-bold neon-text-orange mb-2">
            🟠 Nossa Posição: Preço Justo + Features Completos
          </h3>
          <p className="text-xl text-gray-300">
            O melhor equilíbrio entre custo e funcionalidades
          </p>
        </div>
      </div>
    </section>
  );
}



