import { useInView } from '../../lib/animations';

const problems = [
  {
    icon: '📊',
    stat: '70%',
    description: 'Perguntas são REPETITIVAS',
  },
  {
    icon: '⏰',
    stat: '4-8h',
    description: 'Tempo médio de resposta',
  },
  {
    icon: '💰',
    stat: 'R$ 2.500',
    description: 'Custo por atendente/mês',
  },
  {
    icon: '🕐',
    stat: '8h-18h',
    description: 'Atendimento limitado',
  },
];

export default function Problem() {
  const [ref, isInView] = useInView();

  return (
    <section id="problem" className="landing-section dark">
      <div className="section-container">
        <div
          className="text-center mb-16 p-8 rounded-2xl"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <h2 className="text-6xl font-bold neon-text-red mb-4">
            R$ 1,2 TRILHÕES/ano
          </h2>
          <p className="text-2xl text-gray-300">
            perdidos com atendimento ineficiente no Brasil
          </p>
        </div>

        <div
          ref={ref as any}
          className={`grid-4 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
        >
          {problems.map((problem, index) => (
            <div
              key={index}
              className="neon-card text-center"
              style={{
                animationDelay: `${index * 0.1}s`,
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.6s ease-out',
              }}
            >
              <div className="text-6xl mb-4">{problem.icon}</div>
              <h3 className="text-3xl font-bold neon-text-red mb-2">
                {problem.stat}
              </h3>
              <p className="text-gray-300">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



