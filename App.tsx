import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ClauseAnalysisChart } from './components/MaturityRadar';
import { BenchmarkChart } from './components/BenchmarkChart';
import { ScoreGauge } from './components/ScoreGauge';
import { PrioritizationChart } from './components/PrioritizationChart';
import { AnalysisSection } from './components/AnalysisSection';
import { MethodologyView } from './components/MethodologyView';
import { IsoStandardsView } from './components/IsoStandardsView';
import { fetchRecordById, fetchDemoRecord } from './services/dataService';
import { generateAnalysis } from './services/geminiService';
import { MaturityRecord, AnalysisResult, LoadingState } from './types';
import { Loader2, AlertCircle, FileQuestion, Mail, Calendar, Building2, Sparkles, WifiOff, Lock, ArrowRight, Share2, Printer, Check, KeyRound } from 'lucide-react';

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
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      if (e.message && e.message.includes("DEPLOYMENT_CONFIG_ERROR")) {
        setErrorMessage("Configuration Error: The Google Script URL is invalid. Please check your Vercel Environment Variables.");
      } else if (e.message && e.message.includes("INVALID_RESPONSE")) {
        setErrorMessage("Data Error: Received invalid response from the server. Ensure the Script deployment is set to 'Anyone'.");
      } else if (e.message && e.message.includes("PERMISSION_ERROR")) {
        setErrorMessage("Permission Error: The Google Script is likely set to 'Only Me' or 'Anyone with Google Account'. Please redeploy as 'Anyone'.");
      } else {
        setErrorMessage("An unexpected error occurred connecting to the database. Please check your internet connection.");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Enforce 4-character limit and alphanumeric uppercase format
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setInputId(value);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.length === 4) {
      window.location.hash = `/report?id=${inputId}`;
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderDashboard = () => {
    if (loadingState === LoadingState.IDLE) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-lg w-full text-center">
            
            <div className="flex justify-center mb-8">
              <img src="/iso-fm-logo.png" alt="ISO FM Academy" className="h-20 w-auto object-contain" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Report Access</h2>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Please enter the <span className="font-bold text-slate-700">4-character Access Code</span> sent to your email address to view your maturity diagnostic report.
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-300 transition-all font-mono text-lg tracking-[0.2em] uppercase text-center"
                  value={inputId}
                  onChange={handleInputChange}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                disabled={inputId.length !== 4}
                className="group bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-base font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Access Report
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
               <button onClick={() => window.location.hash = '/report?id=DEMO'} className="text-xs text-slate-400 hover:text-blue-600 underline decoration-slate-300 underline-offset-4 transition-colors">
                 View Demo Report
               </button>
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-400">
            © {new Date().getFullYear()} ISO FM Academy. All rights reserved.
          </p>
        </div>
      );
    }

    if (loadingState === LoadingState.LOADING) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="bg-white p-8 rounded-full shadow-lg mb-6">
             <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Authenticating...</h3>
          <p className="text-slate-400 text-sm mt-2">Verifying Access Code and retrieving data</p>
        </div>
      );
    }

    if (loadingState === LoadingState.NOT_FOUND) {
      return (
        <div className="max-w-md mx-auto mt-20 px-4 text-center animate-fade-in">
          <div className="bg-orange-50 p-8 rounded-2xl border border-orange-100 shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <FileQuestion className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-orange-900 mb-2">Invalid Access Code</h3>
            <p className="text-orange-700 mb-6 text-sm leading-relaxed">
              We couldn't locate a report for Code: <br/>
              <span className="font-mono bg-white px-3 py-1 rounded border border-orange-200 font-bold mt-2 inline-block text-lg tracking-widest">
                {new URLSearchParams(window.location.hash.split('?')[1]).get('id') || 'UNKNOWN'}
              </span>
            </p>
            <p className="text-xs text-orange-600 mb-6">Please check the 4-character code in your email and try again.</p>
            <button 
              onClick={() => {
                setLoadingState(LoadingState.IDLE);
                window.location.hash = '';
              }}
              className="w-full px-6 py-3 bg-white text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors shadow-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.ERROR) {
      return (
        <div className="max-w-md mx-auto mt-20 px-4 text-center animate-fade-in">
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100 shadow-sm">
            <div className="flex justify-center mb-4">
               <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Access Error</h3>
            <p className="text-red-700 mb-6 text-sm">
              {errorMessage || "An unexpected error occurred. Please try again later."}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                  if (id) loadData(id);
                  else {
                    setLoadingState(LoadingState.IDLE);
                    window.location.hash = '';
                  }
                }}
                className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => {
                   setLoadingState(LoadingState.IDLE);
                   window.location.hash = '';
                }}
                className="w-full px-4 py-3 bg-white text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12 print:pb-0">
          {/* Respondent Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden print:shadow-none print:border print:border-slate-300">
             {record.organization.includes("Demo") && (
               <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-amber-200 flex items-center gap-1 print:hidden">
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
                   <a href={`mailto:${record.respondentEmail}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors print:text-slate-900">
                    <Mail className="w-4 h-4" />
                    {record.respondentEmail}
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {record.submissionDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-start lg:self-center">
                 {/* Action Buttons (Hidden on Print) */}
                <div className="hidden md:flex items-center gap-2 mr-4 print:hidden">
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Share'}
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-4 print:bg-transparent print:border-none">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Maturity Level</p>
                    <p className="text-lg font-bold text-slate-800 leading-none">{record.aiMaturityLevel}</p>
                  </div>
                  <div className={`w-2 h-10 rounded-full print:border ${
                    record.aiMaturityScore < 40 ? 'bg-red-500' : 
                    record.aiMaturityScore < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Gauge & Benchmark */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 print:grid-cols-2 print:gap-4 print:mb-4">
            <div className="lg:col-span-1 h-full min-h-[320px] print:min-h-[250px] print:border print:border-slate-200 print:rounded-xl">
               <ScoreGauge score={record.aiMaturityScore} level={record.aiMaturityLevel} />
            </div>
            <div className="lg:col-span-2 h-full min-h-[350px] print:min-h-[250px] print:border print:border-slate-200 print:rounded-xl">
               <BenchmarkChart data={record} />
            </div>
          </div>

          {/* Charts Row 2: Detail Bar Chart & Prioritization Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2 print:gap-4 print:mb-4">
            <div className="min-h-[400px] print:min-h-[300px] print:border print:border-slate-200 print:rounded-xl">
              <ClauseAnalysisChart data={record} />
            </div>
            <div className="min-h-[400px] print:min-h-[300px] print:border print:border-slate-200 print:rounded-xl">
              <PrioritizationChart data={record} />
            </div>
          </div>

          {/* AI Analysis Section (Force page break before this if needed) */}
          <div className="mt-10 print:break-before-page">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Strategic AI Analysis
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-slate-900 px-3 py-1.5 rounded-full shadow-lg shadow-slate-200 print:text-slate-900 print:bg-transparent print:shadow-none print:border print:border-slate-900">
                Gemini 2.5 Flash
              </span>
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