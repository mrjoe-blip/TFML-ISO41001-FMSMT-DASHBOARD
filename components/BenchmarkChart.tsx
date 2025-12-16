import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import { MaturityRecord } from '../types';

interface BenchmarkChartProps {
  data: MaturityRecord;
}

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ data }) => {
  // State to manage visibility of chart series
  const [visible, setVisible] = useState({
    user: true,
    benchmark: true
  });

  const chartData = [
    { subject: 'Planning', A: data.clause6Score, B: 75, fullMark: 100 },
    { subject: 'Support', A: data.clause7Score, B: 70, fullMark: 100 },
    { subject: 'Operation', A: data.clause8Score, B: 80, fullMark: 100 },
    { subject: 'Performance', A: data.clause9Score, B: 65, fullMark: 100 },
  ];

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    const key = dataKey === 'A' ? 'user' : 'benchmark';
    setVisible(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1" style={{ color: entry.color }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="font-medium">{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
      <div className="mb-2 text-center">
        <h3 className="text-lg font-bold text-slate-800">Benchmark Comparison</h3>
        <p className="text-xs text-slate-400">Click legend items to toggle visibility</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            
            <Radar
              name="Your Score"
              dataKey="A"
              stroke="#2563eb"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.5}
              hide={!visible.user}
            />
            
            <Radar
              name="Industry Avg"
              dataKey="B"
              stroke="#94a3b8"
              strokeWidth={2}
              fill="#cbd5e1"
              fillOpacity={0.2}
              strokeDasharray="4 4"
              hide={!visible.benchmark}
            />
            
            <Legend 
              onClick={handleLegendClick}
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', cursor: 'pointer' }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};