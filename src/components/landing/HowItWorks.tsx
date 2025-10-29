import { useInView } from '../../lib/animations';

const steps = [
  {
    number: 1,
    title: 'Criar Agente',
    description: 'Nome, descrição e personalidade',
    time: '2 minutos',
    icon: '🤖',
  },
  {
    number: 2,
    title: 'Adicionar Conhecimento',
    description: 'Upload de documentos (PDF, DOCX)',
    time: '2 minutos',
    icon: '📚',
  },
  {
    number: 3,
    title: 'Conectar Canal',
    description: 'WhatsApp, Telegram, Web',
    time: '1 minuto',
    icon: '🔌',
  },
];

export default function HowItWorks() {
  const [ref, isInView] = useInView();

  return (
    <section id="how-it-works" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Como Funciona</h2>
        <p className="section-subtitle">
          Apenas 3 passos simples para começar em 5 minutos
        </p>

        <div
          ref={ref as any}
          className={`flex flex-col md:flex-row items-center gap-8 mb-12 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {steps.map((step, index) => (
            <div key={index} className="flex-1 w-full">
              <div
                className="text-center"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.6s ease-out',
                  transitionDelay: `${index * 0.2}s`,
                }}
              >
                {/* Step Number */}
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl font-bold"
                  style={{
                    background: 'rgba(255, 107, 0, 0.1)',
                    border: '2px solid #ff6b00',
                    boxShadow: '0 0 30px rgba(255, 107, 0, 0.5)',
                    color: '#ff6b00',
                  }}
                >
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-6xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400 mb-4">{step.description}</p>

                {/* Time Badge */}
                <span
                  className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                  }}
                >
                  ⏱️ {step.time}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block h-0.5 bg-gradient-to-r from-orange-500 to-transparent w-full mt-10" />
              )}
            </div>
          ))}
        </div>

        {/* Result Box */}
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: 'rgba(255, 107, 0, 0.1)',
            border: '2px solid #ff6b00',
          }}
        >
          <h3 className="text-3xl font-bold neon-text-orange mb-2">
            🚀 Resultado: Agente funcionando 24/7
          </h3>
          <p className="text-gray-300">
            Pronto para responder perguntas dos seus clientes em tempo real
          </p>
        </div>
      </div>
    </section>
  );
}



