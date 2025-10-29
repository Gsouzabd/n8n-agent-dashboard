import { useInView } from '../../lib/animations';

const guarantees = [
  {
    icon: '✅',
    title: '30 Dias Garantia',
    description: 'Devolução total do valor se não ficar satisfeito',
  },
  {
    icon: '🔒',
    title: '100% Seguro',
    description: 'Criptografia e conformidade LGPD',
  },
  {
    icon: '⚡',
    title: '99,9% Uptime',
    description: 'Disponibilidade garantida ou crédito de volta',
  },
  {
    icon: '💬',
    title: 'Suporte 4h',
    description: 'Resposta garantida em até 4 horas',
  },
  {
    icon: '🚀',
    title: 'Updates Grátis',
    description: 'Todas as novas features sem custo adicional',
  },
];

export default function Guarantees() {
  const [ref, isInView] = useInView();

  return (
    <section id="guarantees" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Nossas Garantias</h2>
        <p className="section-subtitle">
          Seu investimento está protegido
        </p>

        <div
          ref={ref as any}
          className={`grid md:grid-cols-5 gap-6 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {guarantees.map((guarantee, index) => (
            <div
              key={index}
              className="neon-card text-center group cursor-pointer"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              {/* Icon */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                {guarantee.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold mb-2 neon-text-orange">
                {guarantee.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-400">{guarantee.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



