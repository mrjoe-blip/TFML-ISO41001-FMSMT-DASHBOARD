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
import { Loader2, AlertCircle, Mail, Calendar, Building2, Sparkles, WifiOff, ArrowRight, Printer, Check, KeyRound, Info, Copy, ChevronDown, ChevronUp, ShieldCheck, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [record, setRecord] = useState<MaturityRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [inputId, setInputId] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.split('?')[1]);
      const id = params.get('id');
      if (id) loadData(id);
      else { setLoadingState(LoadingState.IDLE); setRecord(null); }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadData = async (id: string) => {
    setLoadingState(LoadingState.LOADING);
    setAnalysis(null);
    try {
      const data = await fetchRecordById(id);
      if (data) {
        setRecord(data);
        setLoadingState(LoadingState.SUCCESS);
        setAnalysisLoading(true);
        const aiResult = await generateAnalysis(data);
        setAnalysis(aiResult);
        setAnalysisLoading(false);
      } else setLoadingState(LoadingState.NOT_FOUND);
    } catch (e: any) {
      setLoadingState(LoadingState.ERROR);
      if (e.message.includes('|')) {
        const [code, detail] = e.message.split('|');
        setErrorMessage(code);
        setErrorDetail(detail);
      } else {
        setErrorMessage("SYSTEM_FAILURE");
        setErrorDetail(e.message);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.length === 4) window.location.hash = `/report?id=${inputId}`;
  };

  const renderDashboard = () => {
    if (loadingState === LoadingState.IDLE) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
          <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
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
            <p className="text-slate-400 mb-12 text-sm leading-relaxed max-w-[280px] mx-auto font-semibold">
              Enter your secure 4-character code to reveal your ISO 41001 maturity profile.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                  <KeyRound className="w-7 h-7" />
                </div>
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="CODE" 
                  className="w-full pl-16 pr-6 py-7 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-center font-black tracking-[0.6em] uppercase focus:border-blue-500 focus:bg-white focus:ring-[12px] focus:ring-blue-100 outline-none transition-all text-4xl text-slate-800"
                  value={inputId} 
                  onChange={(e) => setInputId(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <button 
                disabled={inputId.length !== 4} 
                className="w-full py-7 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white font-black rounded-[2.5rem] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.96] flex items-center justify-center gap-3 text-xl group"
              >
                Reveal Analysis <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
            
            <div className="mt-14 pt-10 border-t border-slate-50 flex flex-col items-center gap-5">
              <button onClick={() => window.location.hash = '/report?id=DEMO'} className="text-[11px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-[0.2em] transition-all">
                Access Global Sandbox Demo
              </button>
              <div className="flex items-center gap-3 px-5 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">ISO 41001 Secure Protocol</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.LOADING) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 border-8 border-blue-50 rounded-full"></div>
            <div className="absolute inset-0 border-t-8 border-blue-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-10 tracking-tight">Mining Insights</h3>
          <p className="text-slate-400 text-sm mt-3 font-bold tracking-widest uppercase">Deciphering Assessment Data</p>
        </div>
      );
    }

    if (loadingState === LoadingState.ERROR || loadingState === LoadingState.NOT_FOUND) {
      const isNotFound = loadingState === LoadingState.NOT_FOUND;
      return (
        <div className="max-w-xl mx-auto mt-10 animate-fade-in px-4 pb-20">
          <div className="bg-white p-14 rounded-[3.5rem] border border-slate-100 shadow-2xl text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${isNotFound ? 'bg-amber-400' : 'bg-red-500'}`}></div>
            
            <div className={`p-8 ${isNotFound ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'} rounded-[2.5rem] w-fit mx-auto mb-10 border border-current opacity-20`}>
              {isNotFound ? <KeyRound className="w-14 h-14" /> : <WifiOff className="w-14 h-14" />}
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 mb-5 tracking-tight">
              {isNotFound ? "Unrecognized Code" : "Connection Failure"}
            </h3>
            <p className="text-slate-400 text-sm mb-12 leading-relaxed max-w-sm mx-auto font-semibold">
              {isNotFound 
                ? "The diagnostic portal could not find a matching profile for this code. Please check your assessment confirmation email."
                : "The portal encountered an error while attempting to connect to the diagnostic engine. This may be a temporary network issue."}
            </p>

            {!isNotFound && (
              <div className="mb-12">
                <button 
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="text-[12px] font-black text-slate-300 hover:text-slate-500 flex items-center gap-2 uppercase tracking-widest mx-auto py-3 transition-all"
                >
                  <Settings2 className="w-4 h-4" />
                  {showTechDetails ? "Hide" : "View"} Debug Info
                </button>
                {showTechDetails && (
                  <div className="mt-8 p-10 bg-slate-900 rounded-[2.5rem] text-left font-mono text-xs text-slate-500 border border-slate-800 shadow-inner">
                    <p className="text-blue-500 font-black mb-6 uppercase tracking-[0.25em] flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      Diagnostic Trace
                    </p>
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800/50">
                        <span className="text-slate-400 font-bold block mb-2 uppercase tracking-widest text-[10px]">Fault ID</span>
                        <code className="text-blue-200">{errorMessage}</code>
                      </div>
                      <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800/50">
                        <span className="text-slate-400 font-bold block mb-2 uppercase tracking-widest text-[10px]">Root Cause</span>
                        <code className="text-slate-300 break-all leading-relaxed">{errorDetail}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => window.location.hash = ''} className="w-full py-7 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.96]">
              <ArrowRight className="w-6 h-6 rotate-180" /> Return to Login
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row justify-between lg:items-center gap-10 print:shadow-none print:border print:border-slate-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex-1">
              <div className="flex items-center gap-5 mb-4">
                <div className="p-4 bg-blue-50 rounded-3xl text-blue-600 shadow-inner">
                   <Building2 className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{record.organization}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-8 text-sm text-slate-400 font-bold ml-2">
                <span className="text-slate-900 font-black border-r border-slate-100 pr-8 last:border-0">{record.respondentName}</span>
                <span className="flex items-center gap-3"><Mail className="w-5 h-5 text-blue-500/50" /> {record.respondentEmail}</span>
                <span className="flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-500/50" /> {record.submissionDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-4 print:hidden">
                <button onClick={() => {navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-blue-400" />} {copied ? 'Copied' : 'Share'}
                </button>
                <button onClick={() => window.print()} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3"><Printer className="w-5 h-5 text-blue-400" /> Export</button>
              </div>
              <div className="bg-slate-900 px-12 py-7 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 text-center min-w-[200px] border-b-4 border-blue-600">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2">Maturity Status</p>
                <p className="text-2xl font-black text-white leading-none uppercase tracking-tight">{record.aiMaturityLevel}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <ScoreGauge score={record.aiMaturityScore} level={record.aiMaturityLevel} />
            <div className="lg:col-span-2"><BenchmarkChart data={record} /></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <ClauseAnalysisChart data={record} />
            <PrioritizationChart data={record} />
          </div>
          
          <div className="mt-20">
            <div className="flex items-center gap-6 mb-12 px-2">
               <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-2xl shadow-blue-500/30 text-white transition-transform hover:rotate-3">
                 <Sparkles className="w-12 h-12" />
               </div>
               <div>
                 <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Auditor Strategic Summary</h2>
                 <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">AI-Powered ISO 41001 Analysis</p>
               </div>
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