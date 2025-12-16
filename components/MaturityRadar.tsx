import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { MaturityRecord } from '../types';

interface ClauseChartProps {
  data: MaturityRecord;
}

export const ClauseAnalysisChart: React.FC<ClauseChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Planning', code: 'Cl. 6', score: data.clause6Score },
    { name: 'Support', code: 'Cl. 7', score: data.clause7Score },
    { name: 'Operation', code: 'Cl. 8', score: data.clause8Score },
    { name: 'Performance', code: 'Cl. 9', score: data.clause9Score },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-1">{payload[0].payload.name} ({payload[0].payload.code})</p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-300">Score:</span>
            <span className="font-mono font-bold text-blue-300">{payload[0].value}/100</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 text-center">ISO 41001 Clause Breakdown</h3>
        <p className="text-xs text-slate-400 text-center">Detailed performance across key standards</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              domain={[0, 100]} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
            <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="3 3" />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.score >= 70 ? '#3b82f6' : entry.score >= 40 ? '#f59e0b' : '#ef4444'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};