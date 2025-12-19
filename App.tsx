import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ClauseAnalysisChart } from './components/MaturityRadar';
import { BenchmarkChart } from './components/BenchmarkChart';
import { ScoreGauge } from './components/ScoreGauge';
import { PrioritizationChart } from './components/PrioritizationChart';
import { AnalysisSection } from './components/AnalysisSection';
import { MethodologyView } from './components/MethodologyView';
import { IsoStandardsView } from './components/IsoStandardsView';
import { fetchRecordById } from './services/dataService';
import { generateAnalysis } from './services/geminiService';
import { MaturityRecord, AnalysisResult, LoadingState } from './types';
import { Loader2, AlertCircle, FileQuestion, Mail, Calendar, Building2, Sparkles, WifiOff, ArrowRight, Share2, Printer, Check, KeyRound, Settings, Info } from 'lucide-react';

const App: React.FC = () => {
  const [record, setRecord] = useState<MaturityRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [inputId, setInputId] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.split('?')[1]);
      const id = params.get('id');
      
      if (id) {
        loadData(id);
        setCurrentView('dashboard');
      } else {
        setLoadingState(LoadingState.IDLE);
        setRecord(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadData = async (id: string) => {
    setLoadingState(LoadingState.LOADING);
    setAnalysis(null);
    setErrorMessage("");
    
    try {
      const data = await fetchRecordById(id);
      if (data) {
        setRecord(data);
        setLoadingState(LoadingState.SUCCESS);
        setAnalysisLoading(true);
        const aiResult = await generateAnalysis(data);
        setAnalysis(aiResult);
        setAnalysisLoading(false);
      } else {
        setLoadingState(LoadingState.NOT_FOUND);
      }
    } catch (e: any) {
      console.error(e);
      setLoadingState(LoadingState.ERROR);
      setErrorMessage(e.message || "An unexpected error occurred.");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.length === 4) {
      window.location.hash = `/report?id=${inputId}`;
    }
  };

  const renderDashboard = () => {
    if (loadingState === LoadingState.IDLE) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-lg w-full text-center">
            <div className="flex justify-center mb-8">
              <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" alt="ISO FM Academy" className="h-20 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Report Access</h2>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Enter your <span className="font-bold text-slate-700">4-character Access Code</span> to view your diagnostic.
            </p>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  maxLength={4}
                  placeholder="e.g. A9X2" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono text-lg tracking-[0.2em] uppercase text-center transition-all"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                disabled={inputId.length !== 4}
                className="group bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                Access Report
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-slate-100">
               <button onClick={() => window.location.hash = '/report?id=DEMO'} className="text-xs text-slate-400 hover:text-blue-600 underline">
                 View Demo Report
               </button>
            </div>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.LOADING) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Authenticating...</h3>
        </div>
      );
    }

    if (loadingState === LoadingState.ERROR) {
      const isPermissionError = errorMessage === "PERMISSION_ERROR";
      const isNetworkError = errorMessage === "NETWORK_ERROR";

      return (
        <div className="max-w-2xl mx-auto mt-10 animate-fade-in px-4">
          <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl shadow-red-500/5">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 bg-red-50 rounded-full mb-4">
                {isPermissionError ? <Settings className="w-10 h-10 text-red-600" /> : <AlertCircle className="w-10 h-10 text-red-500" />}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                {isPermissionError ? "Backend Permission Issue" : "Connection Failure"}
              </h3>
              <p className="text-slate-500 max-w-md">
                We couldn't retrieve your report. Please verify the following configuration checklist.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8">
              <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">
                <Info className="w-4 h-4 text-blue-500" /> Troubleshooting Guide
              </h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">1</div>
                  <span><strong>Deployment Access:</strong> Ensure the Google Script is deployed as <strong>'Anyone'</strong> (not 'Anyone with Google Account' or 'Only Me').</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">2</div>
                  <span><strong>URL Accuracy:</strong> Confirm your <code>VITE_GOOGLE_SCRIPT_URL</code> in environment variables ends exactly with <code>/exec</code>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">3</div>
                  <span><strong>Script Setup:</strong> Ensure you ran the <strong>'setupSheet'</strong> function from the FMSMD Tool menu in Google Sheets.</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={() => { window.location.hash = ''; }} 
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12 print:pb-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden print:shadow-none print:border print:border-slate-300">
             {record.id === "DEMO" && (
               <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 print:hidden">
                 <WifiOff className="w-3 h-3" /> DEMO MODE
               </div>
             )}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mt-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <Building2 className="w-5 h-5 text-blue-500" />
                   <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{record.organization}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-500 mt-2">
                   <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded print:bg-transparent print:p-0">{record.respondentName}</span>
                   <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {record.respondentEmail}</span>
                   <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {record.submissionDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 print:hidden">
                    <button onClick={() => {navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Share'}
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg"><Printer className="w-4 h-4" /> Print</button>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-4 print:bg-transparent print:border-none">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Maturity Level</p>
                    <p className="text-lg font-bold text-slate-800 leading-none">{record.aiMaturityLevel}</p>
                  </div>
                  <div className={`w-2 h-10 rounded-full ${record.aiMaturityScore < 40 ? 'bg-red-500' : record.aiMaturityScore < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 h-full"><ScoreGauge score={record.aiMaturityScore} level={record.aiMaturityLevel} /></div>
            <div className="lg:col-span-2 h-full"><BenchmarkChart data={record} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <ClauseAnalysisChart data={record} />
            <PrioritizationChart data={record} />
          </div>
          <div className="mt-10 print:break-before-page">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" /> Strategic AI Analysis</h2>
            </div>
            <AnalysisSection analysis={analysis} loading={analysisLoading} />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'methodology' && <MethodologyView />}
      {currentView === 'standards' && <IsoStandardsView />}
    </Layout>
  );
};

export default App;