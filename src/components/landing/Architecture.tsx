import { useInView } from '../../lib/animations';

const layers = [
  {
    title: 'Canais de Entrada',
    color: 'blue',
    items: ['WhatsApp', 'Telegram', 'Website', 'Slack'],
  },
  {
    title: 'Plataforma IA',
    color: 'orange',
    items: ['API Gateway', 'Agente IA', 'RAG Engine'],
    highlight: true,
  },
  {
    title: 'Processamento',
    color: 'green',
    items: ['OpenAI GPT-4', 'Vector DB', 'Base Conhecimento'],
  },
];

export default function Architecture() {
  const [ref, isInView] = useInView();

  return (
    <section id="architecture" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Arquitetura da Solução</h2>
        <p className="section-subtitle">
          Tecnologia robusta e escalável que funciona 24/7
        </p>

        <div
          ref={ref as any}
          className={`max-w-4xl mx-auto ${isInView ? 'animate-fade-in' : 'opacity-0'}`}
        >
          <div className="space-y-8">
            {layers.map((layer, layerIndex) => (
              <div key={layerIndex}>
                {/* Layer */}
                <div
                  className="text-center mb-6"
                  style={{
                    opacity: isInView ? 1 : 0,
                    transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 0.6s ease-out',
                    transitionDelay: `${layerIndex * 0.2}s`,
                  }}
                >
                  <h3
                    className={`text-2xl font-bold mb-6 neon-text-${layer.color}`}
                  >
                    {layer.title}
                  </h3>

                  {/* Items */}
                  <div className="flex justify-center gap-6 flex-wrap">
                    {layer.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`neon-card ${
                          layer.highlight ? 'border-orange-500' : ''
                        }`}
                        style={{
                          minWidth: '150px',
                          textAlign: 'center',
                          padding: '1.5rem 2rem',
                          background: layer.highlight
                            ? 'rgba(255, 107, 0, 0.1)'
                            : 'var(--bg-card)',
                          boxShadow: layer.highlight
                            ? '0 0 20px rgba(255, 107, 0, 0.3)'
                            : undefined,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                {layerIndex < layers.length - 1 && (
                  <div className="text-center text-5xl neon-text-orange">↓</div>
                )}
              </div>
            ))}
          </div>

          {/* Flow Animation Indicator */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">
              Fluxo de dados em <span className="neon-text-orange font-bold">tempo real</span>
            </p>
            <div className="flex justify-center items-center gap-4">
              <div
                className="w-3 h-3 rounded-full glow-effect-orange"
                style={{ background: '#ff6b00' }}
              />
              <div
                className="w-3 h-3 rounded-full glow-effect-orange"
                style={{
                  background: '#ff6b00',
                  animationDelay: '0.2s',
                }}
              />
              <div
                className="w-3 h-3 rounded-full glow-effect-orange"
                style={{
                  background: '#ff6b00',
                  animationDelay: '0.4s',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



