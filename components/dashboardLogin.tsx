import React, { useState } from "react";
import { KeyRound, ArrowRight, Loader2 } from "lucide-react";

interface DashboardLoginProps {
  onSuccess: (data: any) => void;
}

const DashboardLogin: React.FC<DashboardLoginProps> = ({ onSuccess }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) {
      // Logic handled in App.tsx via hash change
      window.location.hash = `/report?id=${code}`;
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
      <div className="flex justify-center mb-8">
        <img 
          src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
          alt="ISO FM Academy" 
          className="h-16 w-auto object-contain" 
        />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Access</h2>
      <p className="text-slate-500 mb-8 text-sm">Enter the 4-character code sent to your email.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyRound className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-center tracking-widest uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg"
            autoFocus
          />
        </div>
        <button 
          type="submit" 
          disabled={code.length !== 4 || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Access Report
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
      
      {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
      
      <div className="mt-8 pt-6 border-t border-slate-50">
        <button 
          onClick={() => window.location.hash = '/report?id=DEMO'} 
          className="text-xs text-slate-400 hover:text-blue-600 underline transition-colors"
        >
          Explore Demo Mode
        </button>
      </div>
    </div>
  );
};

export default DashboardLogin;