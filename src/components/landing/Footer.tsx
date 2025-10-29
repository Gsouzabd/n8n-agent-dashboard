import { scrollToSection } from '../../lib/animations';

const footerLinks = {
  product: [
    { label: 'Features', href: '#solution' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Cases', href: '#cases' },
    { label: 'Roadmap', href: '#roadmap' },
  ],
  resources: [
    { label: 'Documentação', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Tutoriais', href: '#' },
    { label: 'API Docs', href: '#' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '#' },
    { label: 'Privacidade', href: '#' },
    { label: 'LGPD', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

const socialLinks = [
  {
    name: 'LinkedIn',
    icon: '💼',
    href: 'https://linkedin.com/company/venturize-agents',
  },
  {
    name: 'Twitter',
    icon: '🐦',
    href: 'https://twitter.com/venturizeagents',
  },
  {
    name: 'GitHub',
    icon: '💻',
    href: 'https://github.com/venturize-agents',
  },
  {
    name: 'YouTube',
    icon: '📺',
    href: 'https://youtube.com/@venturizeagents',
  },
];

export default function Footer() {
  return (
    <footer
      className="py-16"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid rgba(255, 107, 0, 0.2)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ff6b00"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 107, 0, 0.8))' }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M9 10h.01M15 10h.01M9 14h6" />
              </svg>
              <span className="text-xl font-bold neon-text-orange">Venturize Workspace</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Venturize Agents Workspace - Plataforma completa de IA para automatização inteligente de atendimento com RAG avançado e multi-canal.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl hover:scale-110 transition-transform"
                  title={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-lg font-bold mb-4 neon-text-orange">Produto</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.href.startsWith('#')) {
                        e.preventDefault();
                        scrollToSection(link.href.replace('#', ''));
                      }
                    }}
                    className="text-gray-400 hover:text-orange-500 text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-bold mb-4 neon-text-orange">Recursos</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-orange-500 text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4 neon-text-orange">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-orange-500 text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-8"
          style={{ background: 'rgba(255, 107, 0, 0.2)' }}
        />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © 2025 Venturize Agents Workspace. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-xs">
            Feito com ❤️ no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
}

