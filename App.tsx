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
          <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.06)] border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            
            <div className="mb-10 flex justify-center">
              <div className="bg-white p-4 rounded-3xl inline-block shadow-lg shadow-blue-500/5 border border-slate-50">
                <img 
                  src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
                  alt="ISO FM Academy" 
                  className="h-16 w-auto object-contain" 
                />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 mb-2">Secure Diagnostic Access</h2>
            <p className="text-slate-400 mb-10 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
              Access your personalized ISO 41001 maturity analysis using your 4-character code.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative">
                <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="CODE" 
                  className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-center font-black tracking-[0.6em] uppercase focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-100 outline-none transition-all text-3xl text-slate-800"
                  value={inputId} 
                  onChange={(e) => setInputId(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <button 
                disabled={inputId.length !== 4} 
                className="w-full py-6 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white font-black rounded-[2rem] shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 text-lg group"
              >
                Access Dashboard <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            
            <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
              <button onClick={() => window.location.hash = '/report?id=DEMO'} className="text-xs font-black text-slate-300 hover:text-blue-500 uppercase tracking-widest transition-all">
                View Global Demo Session
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Encrypted Diagnostic Portal</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.LOADING) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-50 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mt-8">Synchronizing Data</h3>
          <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide uppercase">Establishing Secure FM Tunnel</p>
        </div>
      );
    }

    if (loadingState === LoadingState.ERROR || loadingState === LoadingState.NOT_FOUND) {
      const isNotFound = loadingState === LoadingState.NOT_FOUND;
      return (
        <div className="max-w-xl mx-auto mt-10 animate-fade-in px-4 pb-20">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-red-500/5 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isNotFound ? 'bg-amber-400' : 'bg-red-500'}`}></div>
            
            <div className={`p-6 ${isNotFound ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'} rounded-[2rem] w-fit mx-auto mb-8 border border-current opacity-20`}>
              {isNotFound ? <KeyRound className="w-12 h-12" /> : <WifiOff className="w-12 h-12" />}
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 mb-4">
              {isNotFound ? "Code Not Recognized" : "Connection Refused"}
            </h3>
            <p className="text-slate-400 text-sm mb-12 leading-relaxed max-w-sm mx-auto font-medium">
              {isNotFound 
                ? "The diagnostic code you entered was not found in our database. Please double-check your assessment email."
                : "The diagnostic dashboard is having trouble reaching the assessment engine. This is usually due to network security restrictions."}
            </p>

            {!isNotFound && (
              <div className="mb-10">
                <button 
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="text-[11px] font-black text-slate-300 hover:text-slate-500 flex items-center gap-2 uppercase tracking-widest mx-auto py-2 transition-all"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {showTechDetails ? "Hide" : "Review"} Diagnostics
                </button>
                {showTechDetails && (
                  <div className="mt-6 p-8 bg-slate-900 rounded-[2rem] text-left font-mono text-[11px] text-slate-500 border border-slate-800 shadow-inner">
                    <p className="text-blue-500 font-black mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Error Context
                    </p>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block mb-1">Internal Code:</span>
                        <code className="text-slate-300">{errorMessage}</code>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block mb-1">Diagnostic Msg:</span>
                        <code className="text-slate-300 break-all">{errorDetail}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => window.location.hash = ''} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.97]">
              <ArrowRight className="w-5 h-5 rotate-180" /> Return to Login
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row justify-between lg:items-center gap-10 print:shadow-none print:border print:border-slate-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                   <Building2 className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{record.organization}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-8 text-sm text-slate-400 font-medium ml-1">
                <span className="text-slate-900 font-black border-r border-slate-200 pr-8 last:border-0">{record.respondentName}</span>
                <span className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-blue-400" /> {record.respondentEmail}</span>
                <span className="flex items-center gap-2.5"><Calendar className="w-4 h-4 text-blue-400" /> {record.submissionDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3 print:hidden">
                <button onClick={() => {navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false), 2000)}} className="px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Share'}
                </button>
                <button onClick={() => window.print()} className="px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all flex items-center gap-2"><Printer className="w-4 h-4" /> Export</button>
              </div>
              <div className="bg-slate-900 px-10 py-5 rounded-[2rem] shadow-xl shadow-slate-900/10 text-center min-w-[180px]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">Diagnostic Profile</p>
                <p className="text-xl font-black text-white leading-none uppercase">{record.aiMaturityLevel}</p>
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
          
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-10">
               <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20 text-white">
                 <Sparkles className="w-10 h-10" />
               </div>
               <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">ISO 41001 Strategic Insight</h2>
                 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">AI Auditor Intelligence Report</p>
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