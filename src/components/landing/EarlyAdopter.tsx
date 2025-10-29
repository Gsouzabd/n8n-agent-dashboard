import { useState, useEffect } from 'react';
import { useInView, scrollToSection } from '../../lib/animations';

export default function EarlyAdopter() {
  const [vagasOcupadas] = useState(73);
  const totalVagas = 100;
  const percentOcupado = (vagasOcupadas / totalVagas) * 100;
  const [ref, isInView] = useInView();

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2025-03-31T23:59:59').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="early-adopter" className="landing-section dark">
      <div className="section-container">
        <div
          ref={ref as any}
          className={`max-w-4xl mx-auto ${
            isInView ? 'animate-scale-in' : 'opacity-0'
          }`}
        >
          {/* Main Banner */}
          <div
            className="p-12 rounded-2xl text-center mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.2), rgba(0, 212, 255, 0.1))',
              border: '2px solid #ff6b00',
              boxShadow: '0 0 60px rgba(255, 107, 0, 0.4)',
            }}
          >
            <h2 className="text-5xl font-bold neon-text-orange mb-4">
              🚀 PROGRAMA EARLY ADOPTER
            </h2>
            <p className="text-2xl text-gray-300">
              Seja um dos primeiros 100 clientes!
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* 50% OFF */}
            <div className="neon-card text-center">
              <div className="text-5xl mb-4">🎁</div>
              <h3 className="text-2xl font-bold mb-2">50% OFF</h3>
              <p className="text-gray-400 mb-4">Nos primeiros 6 meses</p>
              <div className="text-3xl font-bold neon-text-orange">
                R$ 48,50/mês
              </div>
              <p className="text-sm text-gray-500 mt-2">ao invés de R$ 97</p>
            </div>

            {/* Setup Gratuito */}
            <div className="neon-card text-center">
              <div className="text-5xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold mb-2">Setup Gratuito</h3>
              <p className="text-gray-400 mb-4">Sessão de 1h com especialista</p>
              <div className="text-3xl font-bold neon-text-green">
                R$ 300 grátis
              </div>
              <p className="text-sm text-gray-500 mt-2">economia no onboarding</p>
            </div>

            {/* Suporte Prioritário */}
            <div className="neon-card text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-2">Suporte Prioritário</h3>
              <p className="text-gray-400 mb-4">Resposta em até 4h</p>
              <div className="text-3xl font-bold neon-text-blue">Vitalício</div>
              <p className="text-sm text-gray-500 mt-2">enquanto for cliente</p>
            </div>
          </div>

          {/* Vagas Progress */}
          <div className="neon-card mb-8">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-lg font-semibold">Vagas Disponíveis</span>
                <span className="text-lg font-bold neon-text-orange">
                  {vagasOcupadas}/{totalVagas}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className="h-4 rounded-full overflow-hidden"
                style={{ background: 'rgba(255, 107, 0, 0.2)' }}
              >
                <div
                  className="h-full transition-all duration-500 glow-effect-orange"
                  style={{
                    width: `${percentOcupado}%`,
                    background: '#ff6b00',
                  }}
                />
              </div>

              <p className="text-center text-gray-400 mt-4">
                ⏰ <strong>{100 - vagasOcupadas} vagas restantes</strong> - Garanta a sua agora!
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="neon-card mb-8">
            <h3 className="text-2xl font-bold text-center mb-6">
              ⏳ Oferta Válida Por:
            </h3>

            <div className="grid grid-cols-4 gap-4">
              {/* Days */}
              <div className="text-center">
                <div
                  className="text-5xl font-bold neon-text-orange mb-2"
                  style={{
                    textShadow: '0 0 20px rgba(255, 107, 0, 0.8)',
                  }}
                >
                  {timeLeft.days.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-400">Dias</div>
              </div>

              {/* Hours */}
              <div className="text-center">
                <div
                  className="text-5xl font-bold neon-text-orange mb-2"
                  style={{
                    textShadow: '0 0 20px rgba(255, 107, 0, 0.8)',
                  }}
                >
                  {timeLeft.hours.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-400">Horas</div>
              </div>

              {/* Minutes */}
              <div className="text-center">
                <div
                  className="text-5xl font-bold neon-text-orange mb-2"
                  style={{
                    textShadow: '0 0 20px rgba(255, 107, 0, 0.8)',
                  }}
                >
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-400">Minutos</div>
              </div>

              {/* Seconds */}
              <div className="text-center">
                <div
                  className="text-5xl font-bold neon-text-orange mb-2"
                  style={{
                    textShadow: '0 0 20px rgba(255, 107, 0, 0.8)',
                  }}
                >
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-400">Segundos</div>
              </div>
            </div>

            <p className="text-center text-gray-400 mt-6">
              Válido até: <span className="neon-text-orange font-bold">31/03/2025</span>
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              className="neon-button neon-button-primary text-2xl px-12 py-6 glow-effect-orange"
              onClick={() => scrollToSection('contact')}
            >
              🎁 Garantir Desconto Agora
            </button>
            <p className="text-sm text-gray-400 mt-4">
              ✅ Sem cartão de crédito • ✅ 30 dias garantia • ✅ Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

