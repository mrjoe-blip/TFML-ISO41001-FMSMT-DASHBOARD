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
import { Loader2, Search, AlertCircle, FileQuestion, Mail, Calendar, Building2, Sparkles, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [record, setRecord] = useState<MaturityRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [inputId, setInputId] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');

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
        setErrorMessage("Data Error: Received invalid response from the server.");
      } else {
        setErrorMessage("An unexpected error occurred connecting to the database. Please check your internet connection.");
      }
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.trim()) {
      window.location.hash = `/report?id=${inputId}`;
    }
  };

  const loadDemo = () => {
    window.location.hash = `/report?id=user_1`;
  };

  const renderDashboard = () => {
    if (loadingState === LoadingState.IDLE) {
      return (
        <div className="max-w-md mx-auto mt-12 md:mt-20 px-4 text-center animate-fade-in">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Welcome</h2>
            <p className="text-slate-500 mb-8 text-base">Enter your Respondent ID to view your personalized ISO 41001 AI Maturity Report.</p>
            <form onSubmit={handleManualSearch} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="ID (e.g. user_1)" 
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium">
                <Search className="w-5 h-5" />
              </button>
            </form>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="px-3 bg-white text-slate-400">or try it out</span></div>
            </div>
            <button 
              onClick={loadDemo}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl transition-colors border border-slate-200"
            >
              View Demo Report
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.LOADING) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Analyzing your data...</h3>
          <p className="text-slate-400 text-sm mt-2">Connecting to AI Engine</p>
        </div>
      );
    }

    if (loadingState === LoadingState.NOT_FOUND) {
      return (
        <div className="max-w-md mx-auto mt-20 px-4 text-center animate-fade-in">
          <div className="bg-orange-50 p-8 rounded-2xl border border-orange-100">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <FileQuestion className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-orange-900 mb-2">Report Not Found</h3>
            <p className="text-orange-700 mb-6 text-sm leading-relaxed">
              We couldn't locate report ID <span className="font-mono bg-white px-2 py-0.5 rounded border border-orange-200 font-bold mx-1">{new URLSearchParams(window.location.hash.split('?')[1]).get('id') || 'unknown'}</span>
            </p>
            <button 
              onClick={() => {
                setLoadingState(LoadingState.IDLE);
                window.location.hash = '';
              }}
              className="px-6 py-2 bg-white text-orange-700 font-bold rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors text-sm"
            >
              Back to Search
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.ERROR) {
      return (
        <div className="max-w-md mx-auto mt-20 px-4 text-center animate-fade-in">
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
            <div className="flex justify-center mb-4">
               <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">System Error</h3>
            <p className="text-red-700 mb-6 text-sm">
              {errorMessage || "An unexpected error occurred. Please try again later."}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => {
                  const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                  if (id) loadData(id);
                  else {
                    setLoadingState(LoadingState.IDLE);
                    window.location.hash = '';
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Retry
              </button>
              <button 
                onClick={loadDemo}
                className="px-4 py-2 bg-white text-red-700 font-bold rounded-lg border border-red-200 hover:bg-red-50 transition-colors text-sm"
              >
                View Demo Instead
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12">
          {/* Respondent Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <Building2 className="w-5 h-5 text-blue-500" />
                   <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{record.organization}</h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-500 mt-2">
                   <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{record.respondentName}</span>
                   <a href={`mailto:${record.respondentEmail}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4" />
                    {record.respondentEmail}
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {record.submissionDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-start lg:self-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Maturity Level</p>
                  <p className="text-lg font-bold text-slate-800 leading-none">{record.aiMaturityLevel}</p>
                </div>
                <div className={`w-2 h-10 rounded-full ${
                  record.aiMaturityScore < 40 ? 'bg-red-500' : 
                  record.aiMaturityScore < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Gauge & Benchmark */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 h-full min-h-[320px]">
               <ScoreGauge score={record.aiMaturityScore} level={record.aiMaturityLevel} />
            </div>
            <div className="lg:col-span-2 h-full min-h-[350px]">
               <BenchmarkChart data={record} />
            </div>
          </div>

          {/* Charts Row 2: Detail Bar Chart & Prioritization Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="min-h-[400px]">
              <ClauseAnalysisChart data={record} />
            </div>
            <div className="min-h-[400px]">
              <PrioritizationChart data={record} />
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Strategic AI Analysis
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-slate-900 px-3 py-1.5 rounded-full shadow-lg shadow-slate-200">
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