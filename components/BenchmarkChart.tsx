import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import { MaturityRecord } from '../types';

interface BenchmarkChartProps {
  data: MaturityRecord;
}

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ data }) => {
  const chartData = [
    { subject: 'Planning', A: data.clause6Score, B: 75, fullMark: 100 },
    { subject: 'Support', A: data.clause7Score, B: 70, fullMark: 100 },
    { subject: 'Operation', A: data.clause8Score, B: 80, fullMark: 100 },
    { subject: 'Performance', A: data.clause9Score, B: 65, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[350px] bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-2 text-center">Benchmark Comparison</h3>
      <p className="text-xs text-slate-400 text-center mb-4">Respondent vs. Industry Avg.</p>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Your Score"
            dataKey="A"
            stroke="#2563eb"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.5}
          />
          <Radar
            name="Industry Avg"
            dataKey="B"
            stroke="#94a3b8"
            strokeWidth={2}
            fill="#cbd5e1"
            fillOpacity={0.2}
            strokeDasharray="4 4"
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};