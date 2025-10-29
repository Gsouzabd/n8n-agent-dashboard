import { useState } from 'react';
import { useInView } from '../../lib/animations';
import { scrollToSection } from '../../lib/animations';

const plans = [
  {
    name: 'FREE',
    price: 0,
    features: [
      { text: '3 agentes', available: true },
      { text: '1k msg/mês', available: true },
      { text: '100 documentos', available: true },
      { text: 'Branding customizado', available: false },
      { text: 'API completa', available: false },
    ],
    target: 'Freelancers, Estudantes',
    popular: false,
  },
  {
    name: 'PRO',
    price: 97,
    features: [
      { text: '20 agentes', available: true },
      { text: '50k msg/mês', available: true },
      { text: '10k documentos', available: true },
      { text: 'Branding customizado', available: true },
      { text: 'API completa', available: true },
    ],
    target: 'PMEs, Startups, E-commerces',
    popular: true,
  },
  {
    name: 'ENTERPRISE',
    price: 2500,
    priceLabel: '+',
    features: [
      { text: 'Agentes ilimitados', available: true },
      { text: 'Mensagens ilimitadas', available: true },
      { text: 'Documentos ilimitados', available: true },
      { text: 'White-label completo', available: true },
      { text: 'API dedicada', available: true },
    ],
    target: 'Corporações, Agências',
    popular: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [ref, isInView] = useInView();

  const getPrice = (price: number) => {
    if (isAnnual && price > 0) {
      return Math.floor(price * 0.8); // 20% desconto anual
    }
    return price;
  };

  return (
    <section id="pricing" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Planos e Preços</h2>
        <p className="section-subtitle">
          Escolha o plano perfeito para sua empresa
        </p>

        {/* Toggle Annual/Monthly */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={!isAnnual ? 'font-bold' : 'text-gray-400'}>
            Mensal
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-8 rounded-full transition-colors"
            style={{
              background: isAnnual
                ? '#ff6b00'
                : 'rgba(255, 107, 0, 0.2)',
            }}
          >
            <div
              className="absolute w-6 h-6 bg-white rounded-full top-1 transition-transform"
              style={{
                left: isAnnual ? 'calc(100% - 28px)' : '4px',
              }}
            />
          </button>
          <span className={isAnnual ? 'font-bold' : 'text-gray-400'}>
            Anual{' '}
            <span className="neon-text-green text-sm">(20% OFF)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div
          ref={ref as any}
          className={`grid md:grid-cols-3 gap-8 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative neon-card ${
                plan.popular ? 'border-orange-500' : ''
              }`}
              style={{
                boxShadow: plan.popular
                  ? '0 0 40px rgba(255, 107, 0, 0.4)'
                  : undefined,
                transform: isInView ? 'translateY(0)' : 'translateY(30px)',
                opacity: isInView ? 1 : 0,
                transition: 'all 0.6s ease-out',
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: '#ff6b00',
                    color: '#0a0a0f',
                    boxShadow: '0 0 20px rgba(255, 107, 0, 0.6)',
                  }}
                >
                  MAIS POPULAR
                </div>
              )}

              {/* Plan Name */}
              <h3
                className={`text-2xl font-bold text-center mb-4 ${
                  plan.popular ? 'neon-text-orange' : ''
                }`}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="text-center mb-6">
                <div
                  className={`text-5xl font-bold ${
                    plan.popular ? 'neon-text-orange' : ''
                  }`}
                >
                  R$ {getPrice(plan.price)}
                  {plan.priceLabel}
                </div>
                <div className="text-gray-400 mt-2">
                  /{isAnnual ? 'ano' : 'mês'}
                </div>
                {isAnnual && plan.price > 0 && (
                  <div className="text-sm neon-text-green mt-1">
                    Economize R$ {plan.price * 12 - getPrice(plan.price) * 12}
                    /ano
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm py-2 border-b border-gray-800"
                  >
                    <span className="text-xl">
                      {feature.available ? '✅' : '❌'}
                    </span>
                    <span
                      className={
                        feature.available ? 'text-gray-300' : 'text-gray-600'
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Target */}
              <div className="text-center text-sm text-gray-400 mb-6">
                {plan.target}
              </div>

              {/* CTA Button */}
              <button
                className={`w-full ${
                  plan.popular
                    ? 'neon-button-primary'
                    : 'neon-button-secondary'
                }`}
                onClick={() => scrollToSection('contact')}
              >
                {plan.price === 0 ? 'Começar Grátis' : 'Escolher Plano'}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantees */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-gray-400">
          <span>✅ Sem cartão de crédito</span>
          <span>✅ 30 dias garantia</span>
          <span>✅ Cancele quando quiser</span>
        </div>
      </div>
    </section>
  );
}



