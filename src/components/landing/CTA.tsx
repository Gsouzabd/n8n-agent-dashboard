import { useEffect, useRef } from 'react';
import { scrollToSection } from '../../lib/animations';

export default function CTA() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated gradient background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let hue = 0;

    function animate() {
      if (!ctx || !canvas) return;

      hue = (hue + 0.5) % 360;

      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );

      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
      gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 50%, 0.2)`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-30"
        style={{ pointerEvents: 'none' }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h2 className="text-6xl md:text-7xl font-bold mb-6 animate-fade-in-up">
          Pronto para <span className="neon-text-orange">Começar?</span>
        </h2>

        <p
          className="text-2xl text-gray-300 mb-12 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Transforme seu atendimento em 5 minutos
        </p>

        {/* Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-scale-in"
          style={{ animationDelay: '0.4s' }}
        >
          <button
            className="neon-button neon-button-primary text-2xl px-12 py-6 glow-effect-orange"
            onClick={() => scrollToSection('contact')}
          >
            🚀 Trial Grátis 14 dias
          </button>
          <button
            className="neon-button neon-button-secondary text-2xl px-12 py-6"
            onClick={() => scrollToSection('contact')}
          >
            📞 Agendar Demo
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in"
          style={{ animationDelay: '0.6s' }}
        >
          <div>
            <div className="text-4xl font-bold neon-text-orange mb-2">1.000+</div>
            <div className="text-sm text-gray-400">Empresas Confiando</div>
          </div>
          <div>
            <div className="text-4xl font-bold neon-text-orange mb-2">99,9%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
          <div>
            <div className="text-4xl font-bold neon-text-orange mb-2">4,9★</div>
            <div className="text-sm text-gray-400">Avaliação Média</div>
          </div>
        </div>

        {/* Particles Rising */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: '#ff6b00',
                boxShadow: '0 0 10px rgba(255, 107, 0, 0.8)',
                animation: 'float-up 3s ease-in-out infinite',
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px);
          }
        }
      `}</style>
    </section>
  );
}



