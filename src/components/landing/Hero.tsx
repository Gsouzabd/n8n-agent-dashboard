import { useEffect, useRef } from 'react';
import { useCountUpInView, scrollToSection } from '../../lib/animations';

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ref1, count1] = useCountUpInView(1000);
  const [ref2, count2] = useCountUpInView(97);
  const [ref3, count3] = useCountUpInView(5);

  // Particles animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Particle[] = [];
    const particleCount = 80;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * (canvas?.width || 0);
        this.y = Math.random() * (canvas?.height || 0);
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(255, 107, 0, ${Math.random() * 0.5 + 0.2})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > (canvas?.width || 0)) this.x = 0;
        if (this.x < 0) this.x = canvas?.width || 0;
        if (this.y > (canvas?.height || 0)) this.y = 0;
        if (this.y < 0) this.y = canvas?.height || 0;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            if (!ctx) return;
            ctx.strokeStyle = `rgba(255, 107, 0, ${0.2 - distance / 500})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Particles Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-30"
        style={{ pointerEvents: 'none' }}
      />

      {/* Gradient Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 107, 0, 0.2), transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-fade-in-up">
          <span className="neon-text-orange">Automatize 80%</span>
          <br />
          do Atendimento com IA
        </h1>

        <p className="text-2xl text-gray-300 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <span className="neon-text-orange font-bold">40x mais barato</span> que atendente humano
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button
            className="neon-button neon-button-primary text-lg px-8 py-4 glow-effect-orange"
            onClick={() => scrollToSection('contact')}
          >
            🎁 Trial 14 dias
          </button>
          <button
            className="neon-button neon-button-secondary text-lg px-8 py-4"
            onClick={() => scrollToSection('contact')}
          >
            📞 Agendar Demo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-scale-in" style={{ animationDelay: '0.6s' }}>
          <div ref={ref1 as any} className="neon-card">
            <div className="text-5xl font-bold neon-text-orange mb-2">
              {count1.toLocaleString()}+
            </div>
            <div className="text-gray-400">mensagens/mês</div>
          </div>
          <div ref={ref2 as any} className="neon-card">
            <div className="text-5xl font-bold neon-text-orange mb-2">R$ {count2}</div>
            <div className="text-gray-400">por mês</div>
          </div>
          <div ref={ref3 as any} className="neon-card">
            <div className="text-5xl font-bold neon-text-orange mb-2">{count3} min</div>
            <div className="text-gray-400">para configurar</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff6b00"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}

