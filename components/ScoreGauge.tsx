import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ScoreGaugeProps {
  score: number;
  level: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, level }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s < 40) return '#ef4444'; // Red
    if (s < 70) return '#f59e0b'; // Amber
    return '#10b981'; // Emerald
  };

  const activeColor = getColor(score);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center h-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Overall AI Maturity</h3>
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={180}
              endAngle={0}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell key="cell-0" fill={activeColor} />
              <Cell key="cell-1" fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1 mt-[-20px] text-center">
          <span className="text-4xl font-bold text-slate-800 block">{score}</span>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">/ 100</span>
        </div>
      </div>
      <div className="mt-[-40px] text-center">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            score < 40 ? 'bg-red-100 text-red-800' : 
            score < 70 ? 'bg-amber-100 text-amber-800' : 
            'bg-emerald-100 text-emerald-800'
          }`}>
          {level}
        </span>
      </div>
    </div>
  );
};