import React from 'react';
import { Database, BarChart3, BrainCircuit, FileText } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const steps = [
    {
      icon: <Database className="w-8 h-8 text-blue-600" />,
      title: "Data Collection",
      description: "Responses are gathered via a standardized diagnostic form designed to assess key Facility Management competencies."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-600" />,
      title: "Quantitative Scoring",
      description: "Inputs are converted into numerical scores across four key ISO 41001 clauses: Planning, Support, Operation, and Performance."
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-blue-600" />,
      title: "AI Analysis",
      description: "The Gemini AI engine processes your scoring profile against the ISO 41001 framework to identify patterns and maturity gaps."
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      title: "Report Generation",
      description: "A personalized gap analysis and strategic recommendation report is generated in real-time for immediate action."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-800">Diagnostic Methodology</h2>
          <p className="text-slate-600 mt-2">
            Our approach combines standard ISO 41001 auditing principles with advanced AI analytics to provide a holistic view of your Facility Management maturity.
          </p>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg mb-1">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2">Transparency Note</h3>
            <p className="text-sm text-slate-600">
              The analysis provided in this dashboard is derived directly from the 'TFML-MATURITY-DIAGNOSTIC-TOOL' dataset. 
              The scoring logic (Columns CJ to CO) aligns with the specific weightings of the ISO 41001 clauses to ensure 
              consistency between your manual assessment and this digital twin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};