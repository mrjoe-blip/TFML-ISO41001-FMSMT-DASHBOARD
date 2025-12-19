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
      window.location.hash = `/report?id=${code}`;
    }
  };

  return (
    <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
      
      <div className="mb-12 flex justify-center">
        <div className="bg-white p-5 rounded-[2rem] inline-block shadow-2xl shadow-blue-500/10 border border-slate-50 transition-transform hover:scale-105 duration-500">
          <img 
            src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
            alt="ISO FM Academy" 
            className="h-16 w-auto object-contain" 
          />
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Diagnostic Access</h2>
      <p className="text-slate-400 mb-10 text-sm leading-relaxed max-w-[280px] mx-auto font-semibold">
        Enter your secure 4-character code to reveal your ISO 41001 maturity profile.
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
            <KeyRound className="h-6 w-6" />
          </div>
          <input
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX"
            className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-center font-black tracking-[0.6em] uppercase focus:border-blue-500 focus:bg-white focus:ring-[12px] focus:ring-blue-100 outline-none transition-all text-4xl text-slate-800"
            autoFocus
          />
        </div>
        <button 
          type="submit" 
          disabled={code.length !== 4 || loading}
          className="w-full py-7 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white font-black rounded-[2.5rem] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.96] flex items-center justify-center gap-3 text-xl group"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Access Report
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </>
          )}
        </button>
      </form>
      
      {error && <p className="mt-6 text-sm text-red-600 font-bold">{error}</p>}
      
      <div className="mt-14 pt-10 border-t border-slate-50">
        <button 
          onClick={() => window.location.hash = '/report?id=DEMO'} 
          className="text-[11px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-[0.2em] transition-all"
        >
          Access Global Sandbox Demo
        </button>
      </div>
    </div>
  );
};

export default DashboardLogin;