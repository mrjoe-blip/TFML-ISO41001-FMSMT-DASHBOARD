import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ReferenceLine } from 'recharts';
import { MaturityRecord } from '../types';

interface PrioritizationChartProps {
  data: MaturityRecord;
}

export const PrioritizationChart: React.FC<PrioritizationChartProps> = ({ data }) => {
  const executionScore = (data.clause7Score + data.clause8Score) / 2;
  const strategyScore = (data.clause6Score + data.clause9Score) / 2;

  const chartData = [
    { x: executionScore, y: strategyScore, z: 1, name: 'Current Status' }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs max-w-[200px]">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Strategic Balance</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Execution:</span>
              <span className="font-bold text-blue-600">{data.x.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Strategy:</span>
              <span className="font-bold text-blue-600">{data.y.toFixed(1)}</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 italic">
            Ideally, both scores should be balanced and high (top-right quadrant).
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-slate-800">Strategic Balance Matrix</h3>
        <p className="text-xs text-slate-400">Execution (Cl. 7+8) vs. Strategy (Cl. 6+9)</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Execution" 
              domain={[0, 100]} 
              label={{ value: 'Execution Maturity (Tactical)', position: 'bottom', offset: 0, fontSize: 11, fill: '#64748b' }} 
              tick={{fontSize: 11, fill: '#94a3b8'}}
              axisLine={{stroke: '#e2e8f0'}}
              tickLine={false}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Strategy" 
              domain={[0, 100]} 
              label={{ value: 'Strategic Maturity (Planning)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} 
              tick={{fontSize: 11, fill: '#94a3b8'}}
              axisLine={{stroke: '#e2e8f0'}}
              tickLine={false}
            />
            {/* Quadrant Lines */}
            <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="3 3" />
            
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Position" data={chartData} fill="#2563eb">
              <LabelList dataKey="name" position="top" offset={10} style={{ fontSize: '11px', fill: '#1e293b', fontWeight: 600 }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};