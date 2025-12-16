import React from 'react';
import { AnalysisResult } from '../types';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
            className="text-blue-600 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Helper to format text that might come as bullet points or paragraphs
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null;
      // Heuristic for bullet points
      if (cleanLine.startsWith('-') || cleanLine.startsWith('•') || cleanLine.match(/^\d+\./)) {
        const content = cleanLine.replace(/^[-•\d\.]+\s*/, '');
        return (
          <li key={i} className="mb-2 pl-2 border-l-2 border-transparent hover:border-current/30 transition-colors">
            {renderTextWithLinks(content)}
          </li>
        );
      }
      return <p key={i} className="mb-2">{renderTextWithLinks(cleanLine)}</p>;
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl h-48 border border-slate-100 p-6">
            <div className="h-6 w-8 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-xl p-6 border-t-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Summary</h3>
        </div>
        <div className="text-slate-600 text-sm leading-relaxed">
          {formatContent(analysis.executiveSummary)}
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="bg-white rounded-xl p-6 border-t-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="font-bold text-slate-800">Key Gaps</h3>
        </div>
        <ul className="text-slate-600 text-sm leading-relaxed space-y-1 list-disc list-inside">
          {formatContent(analysis.gapAnalysis)}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-6 border-t-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-800">Actions</h3>
        </div>
        <ul className="text-slate-600 text-sm leading-relaxed space-y-1 list-disc list-inside">
          {formatContent(analysis.recommendations)}
        </ul>
      </div>
    </div>
  );
};