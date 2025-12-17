import React, { useState, useEffect } from 'react';
import { Menu, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'standards', label: 'ISO Standards' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Secure Header with Glassmorphism - Hidden when printing */}
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 print:hidden ${
          scrolled || isMobileMenuOpen 
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200' 
            : 'bg-white/80 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer group select-none" 
            onClick={() => onNavigate('dashboard')}
          >
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/99d46a833cb2e3ba591e71a26c4a452d99779266/public/iso-fm-logo.png" alt="ISO FM Academy" className="h-10 w-auto object-contain" />
            <div className="hidden sm:flex flex-col border-l border-slate-300 pl-3">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Maturity Diagnostic</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ISO 41001 Certified</span>
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation - Centered Pill */}
          <nav className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 shadow-inner">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    currentView === item.id 
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Right Section: Contact / Actions */}
          <div className="hidden md:flex items-center gap-3">
            <a 
              href="https://isofmacademy.ng/consult/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-600 rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              <span>Consult Expert</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-xl animate-fade-in z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    currentView === item.id 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-2 mx-2"></div>
              <a 
                href="https://isofmacademy.ng/consult/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-xl transition-colors"
              >
                <span>Consult Expert</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content Area with top padding for fixed header */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 space-y-8 print:mt-0 print:px-0">
        {children}
      </main>

      {/* Footer - Hidden when printing */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-4 text-white">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/99d46a833cb2e3ba591e71a26c4a452d99779266/public/iso-fm-logo.png" alt="ISO FM Academy" className="h-8 w-auto brightness-0 invert opacity-80" />
            <span className="font-bold text-lg">Maturity Diagnostic</span>
          </div>
          <p className="text-sm font-medium text-slate-300 max-w-md mx-auto mb-6">
            Empowering Facility Management professionals with AI-driven ISO 41001 maturity assessments.
          </p>
          <p className="text-xs opacity-50">
            © {new Date().getFullYear()} ISO FM Academy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};