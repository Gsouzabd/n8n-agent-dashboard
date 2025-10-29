import { useState } from 'react';
import { useInView } from '../../lib/animations';

const cases = [
  {
    id: 'ecommerce',
    icon: '🛍️',
    title: 'E-commerce',
    subtitle: 'Loja de Roupas Fashion',
    stats: [
      { label: 'Economia', value: 'R$ 2.403/mês', color: 'green' },
      { label: 'Aumento vendas', value: '+56%', color: 'green' },
      { label: 'ROI', value: '1.772%', color: 'orange' },
    ],
    testimonial: {
      text: '"Reduzimos 80% do tempo de atendimento e aumentamos as vendas. O ROI foi absurdo!"',
      author: 'Maria Silva, CEO da Loja Fashion',
    },
  },
  {
    id: 'saas',
    icon: '💻',
    title: 'SaaS B2B',
    subtitle: 'Software de Gestão',
    stats: [
      { label: 'Economia', value: 'R$ 94k/ano', color: 'green' },
      { label: 'Redução churn', value: '-62%', color: 'green' },
      { label: 'NPS', value: '35 → 68', color: 'orange' },
    ],
    testimonial: {
      text: '"Nossos clientes adoram o suporte instantâneo 24/7. O NPS subiu impressionantemente."',
      author: 'João Santos, CTO da GestãoPro',
    },
  },
  {
    id: 'agency',
    icon: '🏢',
    title: 'Agência',
    subtitle: 'White-Label',
    stats: [
      { label: 'Receita nova', value: 'R$ 119k/ano', color: 'green' },
      { label: 'Margem', value: '80%', color: 'green' },
      { label: 'Crescimento MRR', value: '150%/ano', color: 'orange' },
    ],
    testimonial: {
      text: '"Adicionamos uma nova linha de receita com margem alta. Nossos clientes amam!"',
      author: 'Pedro Lima, Sócio da Digital Agency',
    },
  },
];

export default function UseCases() {
  const [activeTab, setActiveTab] = useState('ecommerce');
  const [ref, isInView] = useInView();

  const activeCase = cases.find((c) => c.id === activeTab) || cases[0];

  return (
    <section id="cases" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Cases de Uso Reais</h2>
        <p className="section-subtitle">
          Veja como empresas reais estão transformando seus resultados
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {cases.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === item.id
                  ? 'neon-button-primary'
                  : 'neon-button-secondary'
              }`}
            >
              {item.icon} {item.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          ref={ref as any}
          className={`neon-card ${isInView ? 'animate-fade-in' : 'opacity-0'}`}
        >
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{activeCase.icon}</div>
            <h3 className="text-3xl font-bold mb-2">{activeCase.title}</h3>
            <p className="text-xl text-gray-400">{activeCase.subtitle}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {activeCase.stats.map((stat, index) => (
              <div
                key={index}
                className="p-6 rounded-xl text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid rgba(${
                    stat.color === 'green' ? '16, 185, 129' : '255, 107, 0'
                  }, 0.3)`,
                }}
              >
                <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
                <div
                  className={`text-3xl font-bold ${
                    stat.color === 'green' ? 'neon-text-green' : 'neon-text-orange'
                  }`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: 'rgba(255, 107, 0, 0.05)',
              border: '1px solid rgba(255, 107, 0, 0.2)',
            }}
          >
            <p className="text-lg italic mb-4 text-gray-300">
              {activeCase.testimonial.text}
            </p>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: 'rgba(255, 107, 0, 0.2)' }}
              >
                👤
              </div>
              <div>
                <div className="font-semibold">{activeCase.testimonial.author}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



