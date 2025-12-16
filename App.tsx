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
import { Loader2, Search, AlertCircle, FileQuestion, Mail } from 'lucide-react';

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
        setErrorMessage("Deployment Error: The Google Script URL is invalid. Please check your Vercel Environment Variables.");
      } else {
        setErrorMessage("An unexpected error occurred connecting to the database.");
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
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome</h2>
            <p className="text-slate-500 mb-6 text-sm md:text-base">Enter your Respondent ID to view your personalized ISO 41001 AI Maturity Report.</p>
            <form onSubmit={handleManualSearch} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="ID (e.g. user_1)" 
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">or</span></div>
            </div>
            <button 
              onClick={loadDemo}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg transition-colors text-sm"
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
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <h3 className="text-base font-medium text-slate-700">Loading your diagnostic...</h3>
        </div>
      );
    }

    if (loadingState === LoadingState.NOT_FOUND) {
      return (
        <div className="max-w-md mx-auto mt-20 px-4 text-center animate-fade-in">
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <div className="flex justify-center mb-3">
              <FileQuestion className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-orange-800 mb-2">Report Not Found</h3>
            <p className="text-orange-700 mb-4 text-sm leading-relaxed">
              We couldn't locate report ID <span className="font-mono bg-orange-100 px-1 rounded font-bold">{new URLSearchParams(window.location.hash.split('?')[1]).get('id') || 'unknown'}</span>.
            </p>
            <button 
              onClick={() => {
                setLoadingState(LoadingState.IDLE);
                window.location.hash = '';
              }}
              className="text-orange-800 font-medium hover:underline text-sm"
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
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <div className="flex justify-center mb-3">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-red-800 mb-2">System Error</h3>
            <p className="text-red-700 mb-4 text-sm">
              {errorMessage || "An unexpected error occurred. Please try again later."}
            </p>
            <button 
              onClick={() => {
                const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
                if (id) loadData(id);
                else {
                  setLoadingState(LoadingState.IDLE);
                  window.location.hash = '';
                }
              }}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (loadingState === LoadingState.SUCCESS && record) {
      return (
        <div className="animate-fade-in pb-12">
          {/* Respondent Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 break-words">{record.organization}</h2>
              <div className="flex flex-col md:flex-row md:items-center md:gap-4 mt-2 text-sm text-slate-500">
                <span className="font-medium">{record.respondentName}</span>
                <span className="hidden md:inline text-slate-300">•</span>
                <a href={`mailto:${record.respondentEmail}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <Mail className="w-3 h-3" />
                  {record.respondentEmail}
                </a>
                <span className="hidden md:inline text-slate-300">•</span>
                <span>{record.submissionDate}</span>
              </div>
            </div>
            <div className="self-start md:self-center flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-xs font-semibold text-blue-400 uppercase">Level</span>
              <span className="text-sm font-bold text-blue-700">{record.aiMaturityLevel}</span>
            </div>
          </div>

          {/* Charts Row 1: Gauge & Benchmark */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 h-full min-h-[300px]">
               <ScoreGauge score={record.aiMaturityScore} level={record.aiMaturityLevel} />
            </div>
            <div className="lg:col-span-2 h-full min-h-[350px]">
               <BenchmarkChart data={record} />
            </div>
          </div>

          {/* Charts Row 2: Detail Bar Chart & Prioritization Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="min-h-[350px]">
              <ClauseAnalysisChart data={record} />
            </div>
            <div className="min-h-[350px]">
              <PrioritizationChart data={record} />
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Diagnostic Insights</h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">AI Generated</span>
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