import { useState } from 'react';
import { scrollToSection, useScrollNavbar, useActiveSection } from '../../lib/animations';

const navItems = [
  { id: 'solution', label: 'Solução' },
  { id: 'cases', label: 'Cases' },
  { id: 'pricing', label: 'Preços' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contato' },
];

export default function Navbar() {
  const isScrolled = useScrollNavbar(50);
  const activeSection = useActiveSection(navItems.map(item => item.id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-opacity-95 backdrop-blur-lg shadow-lg'
          : 'bg-opacity-0'
      }`}
      style={{
        backgroundColor: isScrolled ? 'rgba(10, 10, 15, 0.95)' : 'transparent',
        borderBottom: isScrolled ? '1px solid rgba(255, 107, 0, 0.2)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('hero')}>
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

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-all duration-300 hover:text-orange-500 ${
                  activeSection === item.id
                    ? 'text-orange-500'
                    : 'text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <button
              className="neon-button neon-button-primary"
              onClick={() => scrollToSection('contact')}
            >
              Trial Grátis
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-orange-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-orange-500/20">
            <div className="flex flex-col gap-4 mt-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? 'text-orange-500'
                      : 'text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                className="neon-button neon-button-primary w-full justify-center"
                onClick={() => {
                  scrollToSection('contact');
                  setMobileMenuOpen(false);
                }}
              >
                Trial Grátis
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

