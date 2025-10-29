import { useState } from 'react';
import { useInView } from '../../lib/animations';

export default function ROICalculator() {
  const [numAtendentes, setNumAtendentes] = useState(2);
  const [msgsPorDia, setMsgsPorDia] = useState(100);
  const [horasPorDia, setHorasPorDia] = useState(8);
  const [ref, isInView] = useInView();

  // Cálculos
  const custoAtual = numAtendentes * 2500;
  const custoIA = 97;
  const economiaMensal = custoAtual - custoIA;
  const economiaAnual = economiaMensal * 12;
  const roi = ((economiaMensal / custoIA) * 100).toFixed(0);
  const payback = (custoIA / economiaMensal).toFixed(1);

  return (
    <section id="roi-calculator" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Calculadora de ROI</h2>
        <p className="section-subtitle">
          Descubra quanto você pode economizar com IA
        </p>

        <div
          ref={ref as any}
          className={`max-w-4xl mx-auto ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {/* Inputs */}
          <div className="neon-card mb-8">
            <div className="space-y-6">
              {/* Num Atendentes */}
              <div>
                <label className="flex justify-between mb-2 text-gray-300">
                  <span>Número de Atendentes</span>
                  <span className="neon-text-orange font-bold">
                    {numAtendentes}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numAtendentes}
                  onChange={(e) => setNumAtendentes(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ff6b00 0%, #ff6b00 ${
                      (numAtendentes - 1) * 11.11
                    }%, rgba(255, 107, 0, 0.2) ${
                      (numAtendentes - 1) * 11.11
                    }%, rgba(255, 107, 0, 0.2) 100%)`,
                  }}
                />
              </div>

              {/* Msgs por Dia */}
              <div>
                <label className="flex justify-between mb-2 text-gray-300">
                  <span>Mensagens por Dia</span>
                  <span className="neon-text-orange font-bold">
                    {msgsPorDia}
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={msgsPorDia}
                  onChange={(e) => setMsgsPorDia(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ff6b00 0%, #ff6b00 ${
                      ((msgsPorDia - 50) / 950) * 100
                    }%, rgba(255, 107, 0, 0.2) ${
                      ((msgsPorDia - 50) / 950) * 100
                    }%, rgba(255, 107, 0, 0.2) 100%)`,
                  }}
                />
              </div>

              {/* Horas por Dia */}
              <div>
                <label className="flex justify-between mb-2 text-gray-300">
                  <span>Horas de Atendimento/Dia</span>
                  <span className="neon-text-orange font-bold">
                    {horasPorDia}h
                  </span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={horasPorDia}
                  onChange={(e) => setHorasPorDia(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ff6b00 0%, #ff6b00 ${
                      ((horasPorDia - 4) / 20) * 100
                    }%, rgba(255, 107, 0, 0.2) ${
                      ((horasPorDia - 4) / 20) * 100
                    }%, rgba(255, 107, 0, 0.2) 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Custo Atual */}
            <div
              className="p-6 rounded-xl text-center"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="text-sm text-gray-400 mb-2">Custo Atual</div>
              <div className="text-4xl font-bold neon-text-red">
                R$ {custoAtual.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 mt-1">/mês</div>
            </div>

            {/* Custo com IA */}
            <div
              className="p-6 rounded-xl text-center"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div className="text-sm text-gray-400 mb-2">Custo com IA</div>
              <div className="text-4xl font-bold neon-text-green">
                R$ {custoIA}
              </div>
              <div className="text-sm text-gray-400 mt-1">/mês</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Economia Mensal */}
            <div className="neon-card text-center">
              <div className="text-sm text-gray-400 mb-2">Economia Mensal</div>
              <div className="text-3xl font-bold neon-text-green">
                R$ {economiaMensal.toLocaleString()}
              </div>
            </div>

            {/* Economia Anual */}
            <div className="neon-card text-center">
              <div className="text-sm text-gray-400 mb-2">Economia Anual</div>
              <div className="text-3xl font-bold neon-text-green">
                R$ {economiaAnual.toLocaleString()}
              </div>
            </div>

            {/* ROI */}
            <div className="neon-card text-center">
              <div className="text-sm text-gray-400 mb-2">ROI</div>
              <div className="text-3xl font-bold neon-text-orange">
                {roi}%
              </div>
            </div>
          </div>

          {/* Payback */}
          <div className="mt-8 text-center">
            <p className="text-xl text-gray-300">
              ⚡ Payback em apenas{' '}
              <span className="neon-text-orange font-bold text-2xl">
                {payback} {parseFloat(payback) === 1 ? 'mês' : 'meses'}
              </span>
            </p>
          </div>

          {/* Visual Bar Chart */}
          <div className="mt-12">
            <h3 className="text-xl font-bold text-center mb-6">
              Comparação Visual
            </h3>
            <div className="space-y-4">
              {/* Custo Atual */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Custo Atual</span>
                  <span className="neon-text-red font-bold">
                    R$ {custoAtual.toLocaleString()}
                  </span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden bg-gray-800">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: '100%',
                      background:
                        'linear-gradient(90deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.5))',
                    }}
                  />
                </div>
              </div>

              {/* Custo com IA */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Custo com IA</span>
                  <span className="neon-text-green font-bold">R$ {custoIA}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden bg-gray-800">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(custoIA / custoAtual) * 100}%`,
                      background:
                        'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(16, 185, 129, 0.5))',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

