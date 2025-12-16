import React from 'react';
import { LayoutDashboard, Menu, X, ExternalLink } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'standards', label: 'ISO Standards' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header with Backdrop Blur and Fixed Positioning */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => onNavigate('dashboard')}
          >
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm group-hover:bg-blue-700 transition-colors">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">TFML Diagnostic</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">ISO 41001 AI Tool</span>
            </div>
          </div>
          
          {/* Desktop Navigation - Centered & Spaced */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  currentView === item.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Section: Contact / Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href="https://isofmacademy.ng/consult/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              <span>Contact Expert</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-xl animate-fade-in z-40">
            <div className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    currentView === item.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-2"></div>
              <a 
                href="https://isofmacademy.ng/consult/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                Contact Expert <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-slate-300">© 2024 TFML Diagnostic Tool</p>
          <p className="text-xs mt-2 opacity-60">Based on ISO 41001 Facility Management Framework</p>
        </div>
      </footer>
    </div>
  );
};