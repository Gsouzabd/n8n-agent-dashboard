import { useState } from 'react';
import { useInView } from '../../lib/animations';

const faqs = [
  {
    question: 'Como funciona o trial grátis de 14 dias?',
    answer:
      'Você pode testar todas as funcionalidades do Plano PRO por 14 dias sem precisar de cartão de crédito. Após o período, você decide se quer continuar.',
  },
  {
    question: 'Preciso saber programar para usar?',
    answer:
      'Não! A plataforma é 100% no-code. Você configura tudo através de uma interface visual simples e intuitiva.',
  },
  {
    question: 'Quais canais posso integrar?',
    answer:
      'Atualmente suportamos WhatsApp Business, Telegram, widget web, Slack e Discord. Estamos constantemente adicionando novos canais.',
  },
  {
    question: 'Como o agente aprende sobre meu negócio?',
    answer:
      'Você faz upload dos seus documentos (PDF, DOCX, planilhas) e nosso sistema usa RAG (Retrieval Augmented Generation) para o agente responder baseado no seu conhecimento.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim! Não há fidelidade. Você pode cancelar quando quiser e não será cobrado no próximo ciclo.',
  },
  {
    question: 'Os dados dos meus clientes são seguros?',
    answer:
      'Absolutamente. Usamos criptografia de ponta a ponta, armazenamento em servidores certificados e estamos em conformidade com a LGPD.',
  },
  {
    question: 'Qual a diferença entre FREE e PRO?',
    answer:
      'O FREE é limitado a 3 agentes e 1k mensagens/mês, ideal para testar. O PRO oferece 20 agentes, 50k mensagens, branding personalizado e API completa.',
  },
  {
    question: 'Como funciona o white-label?',
    answer:
      'No plano Enterprise, você pode personalizar completamente a plataforma com seu logo, cores, domínio e revender como seu próprio produto.',
  },
  {
    question: 'Tem suporte em português?',
    answer:
      'Sim! Todo suporte, documentação e interface estão em português. Nossa equipe responde em até 4h no horário comercial.',
  },
  {
    question: 'Posso migrar meus dados de outra plataforma?',
    answer:
      'Sim! Oferecemos migração assistida gratuita para clientes dos planos PRO e Enterprise.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ref, isInView] = useInView();

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="faq" className="landing-section dark">
      <div className="section-container">
        <h2 className="section-title">Perguntas Frequentes</h2>
        <p className="section-subtitle">
          Tudo que você precisa saber sobre a plataforma
        </p>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar pergunta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 rounded-xl text-lg"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(255, 107, 0, 0.2)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* FAQ Items */}
        <div
          ref={ref as any}
          className={`max-w-3xl mx-auto space-y-4 ${
            isInView ? 'animate-fade-in' : 'opacity-0'
          }`}
        >
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              className="neon-card cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`,
              }}
            >
              {/* Question */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold pr-8">{faq.question}</h3>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ff6b00"
                  strokeWidth="2"
                  className={`transition-transform flex-shrink-0 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Answer */}
              {openIndex === index && (
                <div
                  className="mt-4 pt-4 text-gray-400 border-t"
                  style={{ borderColor: 'rgba(255, 107, 0, 0.2)' }}
                >
                  {faq.answer}
                </div>
              )}
            </div>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              Nenhuma pergunta encontrada para "{searchTerm}"
            </div>
          )}
        </div>

        {/* Still have questions */}
        <div className="text-center mt-12">
          <p className="text-lg text-gray-300 mb-4">
            Ainda tem dúvidas? Estamos aqui para ajudar!
          </p>
          <button
            className="neon-button neon-button-secondary"
            onClick={() => {
              const section = document.getElementById('contact');
              section?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            💬 Falar com Suporte
          </button>
        </div>
      </div>
    </section>
  );
}



