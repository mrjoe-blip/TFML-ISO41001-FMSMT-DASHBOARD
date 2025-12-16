import React from 'react';

export const IsoStandardsView: React.FC = () => {
  const clauses = [
    {
      id: "6",
      title: "Planning",
      focus: "Risks, Opportunities & Objectives",
      content: "Clause 6 focuses on how the organization plans for the FM system. It involves identifying risks and opportunities, setting strategic FM objectives, and planning how to achieve them. This forms the strategic backbone of the FM system."
    },
    {
      id: "7",
      title: "Support",
      focus: "Resources, Competence & Information",
      content: "Clause 7 covers the support mechanisms required to run the FM system effectively. This includes resource allocation, organizational competence, awareness, communication strategies, and the management of documented information."
    },
    {
      id: "8",
      title: "Operation",
      focus: "Operational Planning & Control",
      content: "Clause 8 deals with the execution of FM services. It requires organizations to plan, implement, and control the processes needed to meet requirements, including the coordination of external providers and integrated service delivery."
    },
    {
      id: "9",
      title: "Performance Evaluation",
      focus: "Monitoring, Measurement & Analysis",
      content: "Clause 9 is about checking results. It requires monitoring, measurement, analysis, and evaluation of the FM system's performance. This includes internal audits and management reviews to ensure continuing suitability and effectiveness."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800">ISO 41001 Framework</h2>
        <p className="text-slate-500 mt-2">Key clauses guiding the Facility Management Management System (FMMS)</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {clauses.map((clause) => (
          <div key={clause.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-2">
                    Clause {clause.id}
                  </span>
                  <h3 className="text-xl font-bold text-slate-800">{clause.title}</h3>
                </div>
                <div className="text-right max-w-[200px]">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Primary Focus</span>
                  <p className="text-sm font-semibold text-slate-600">{clause.focus}</p>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {clause.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};