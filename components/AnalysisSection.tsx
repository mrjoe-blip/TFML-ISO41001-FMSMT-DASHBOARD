import React from 'react';
import { AnalysisResult } from '../types';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AnalysisSectionProps {
  analysis: AnalysisResult | null;
  loading: boolean;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ analysis, loading }) => {
  
  // Helper to render text with clickable links
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline break-all transition-colors"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Helper to format text into structured lists or paragraphs
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null;
      
      // Detect bullet points
      if (cleanLine.startsWith('-') || cleanLine.startsWith('•') || cleanLine.match(/^\d+\./)) {
        const content = cleanLine.replace(/^[-•\d\.]+\s*/, '');
        return (
          <li key={i} className="flex items-start gap-2 mb-3 text-slate-700">
            <span className="mt-1.5 min-w-[6px] w-[6px] h-[6px] rounded-full bg-current opacity-60"></span>
            <span className="leading-relaxed">{renderTextWithLinks(content)}</span>
          </li>
        );
      }
      return <p key={i} className="mb-3 text-slate-700 leading-relaxed">{renderTextWithLinks(cleanLine)}</p>;
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl h-64 border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
              <div className="h-5 w-24 bg-slate-100 rounded"></div>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-full bg-slate-100 rounded"></div>
              <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
              <div className="h-3 w-4/6 bg-slate-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Executive Summary Card */}
      <div className="group bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Executive Summary</h3>
        </div>
        <div className="text-sm">
          {formatContent(analysis.executiveSummary)}
        </div>
      </div>

      {/* Gap Analysis Card */}
      <div className="group bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Critical Gaps</h3>
        </div>
        <ul className="text-sm">
          {formatContent(analysis.gapAnalysis)}
        </ul>
      </div>

      {/* Recommendations Card */}
      <div className="group bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Recommendations</h3>
        </div>
        <ul className="text-sm">
          {formatContent(analysis.recommendations)}
        </ul>
        <div className="mt-4 pt-4 border-t border-emerald-100/50">
          <button className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
            VIEW ACTION PLAN <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};