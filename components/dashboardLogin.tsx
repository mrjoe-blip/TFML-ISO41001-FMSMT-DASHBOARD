import React, { useState } from "react";
import { KeyRound, ArrowRight } from "lucide-react";

interface DashboardLoginProps {
  onSuccess: (data: any) => void;
}

const DashboardLogin: React.FC<DashboardLoginProps> = ({ onSuccess }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) return;
    
    setLoading(true);
    setError(null);
    try {
      // Note: This component assumes a specific /api/fetchReport route exists or matches your setup
      const res = await fetch(`/api/fetchReport?id=${code}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        onSuccess(json);
      }
    } catch (err) {
      setError("Unable to connect to service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Access</h2>
      <p className="text-slate-500 mb-8 text-sm">Enter your 4-character code.</p>
      
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
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-center tracking-widest uppercase focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button 
          type="submit" 
          disabled={code.length !== 4 || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          {loading ? "Authenticating..." : "Access Report"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};

export default DashboardLogin;