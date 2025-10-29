import { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import Solution from '../components/landing/Solution';
import HowItWorks from '../components/landing/HowItWorks';
import Architecture from '../components/landing/Architecture';
import UseCases from '../components/landing/UseCases';
import Pricing from '../components/landing/Pricing';
import ROICalculator from '../components/landing/ROICalculator';
import CustomerJourney from '../components/landing/CustomerJourney';
import Differentiation from '../components/landing/Differentiation';
import Roadmap from '../components/landing/Roadmap';
import EarlyAdopter from '../components/landing/EarlyAdopter';
import FAQ from '../components/landing/FAQ';
import Guarantees from '../components/landing/Guarantees';
import Contact from '../components/landing/Contact';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';
import '../styles/landing.css';

export default function LandingPage() {
  useEffect(() => {
    // Import Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Scroll to top on mount
    window.scrollTo(0, 0);

    // Set page title
    document.title = 'Venturize Agents Workspace - Plataforma Completa de IA';

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <Architecture />
      <UseCases />
      <Pricing />
      <ROICalculator />
      <CustomerJourney />
      <Differentiation />
      <Roadmap />
      <EarlyAdopter />
      <FAQ />
      <Guarantees />
      <Contact />
      <CTA />
      <Footer />
    </div>
  );
}

