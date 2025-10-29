import { useState } from 'react';
import { useInView } from '../../lib/animations';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ref, isInView] = useInView();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Real-time validation
    if (name === 'email' && value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: 'Email inválido' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Nome é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    else if (!validateEmail(formData.email))
      newErrors.email = 'Email inválido';
    if (!formData.message) newErrors.message = 'Mensagem é obrigatória';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit logic here
    alert('Formulário enviado com sucesso! Entraremos em contato em breve.');
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  return (
    <section id="contact" className="landing-section">
      <div className="section-container">
        <h2 className="section-title">Entre em Contato</h2>
        <p className="section-subtitle">
          Estamos prontos para transformar seu atendimento
        </p>

        <div
          ref={ref as any}
          className={`grid md:grid-cols-2 gap-12 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {/* Form */}
          <div className="neon-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Nome *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      errors.name ? '#ef4444' : 'rgba(255, 107, 0, 0.2)'
                    }`,
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Seu nome completo"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      errors.email ? '#ef4444' : 'rgba(255, 107, 0, 0.2)'
                    }`,
                    color: 'var(--text-primary)',
                  }}
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Empresa
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 107, 0, 0.2)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Nome da sua empresa (opcional)"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Mensagem *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg resize-none"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      errors.message ? '#ef4444' : 'rgba(255, 107, 0, 0.2)'
                    }`,
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Como podemos ajudar?"
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
              </div>

              {/* Submit */}
              <button type="submit" className="neon-button neon-button-primary w-full">
                📨 Enviar Mensagem
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* WhatsApp */}
            <div className="neon-card">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📱</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
                  <p className="text-gray-400 mb-2">+55 11 99999-9999</p>
                  <p className="text-sm text-gray-500">Responde em até 1h</p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="neon-card">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📧</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Email</h3>
                  <p className="text-gray-400 mb-1">vendas@venturize-agents.com</p>
                  <p className="text-gray-400 mb-2">comercial@venturize-agents.com</p>
                  <p className="text-sm text-gray-500">Responde em até 4h</p>
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="neon-card">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🌐</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Website</h3>
                  <p className="text-gray-400 mb-1">venturize-agents.com</p>
                  <p className="text-gray-400 mb-2">
                    calendly.com/venturize-agents-demo
                  </p>
                  <p className="text-sm text-gray-500">Agende uma demo</p>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="neon-card">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💼</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Redes Sociais</h3>
                  <div className="space-y-1">
                    <p className="text-gray-400">
                      LinkedIn: /company/venturize-agents
                    </p>
                    <p className="text-gray-400">Twitter: @venturizeagents</p>
                    <p className="text-gray-400">GitHub: /venturize-agents</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Siga para novidades
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

