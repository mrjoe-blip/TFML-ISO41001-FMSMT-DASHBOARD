import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { MaturityRecord } from '../types';

interface PrioritizationChartProps {
  data: MaturityRecord;
}

export const PrioritizationChart: React.FC<PrioritizationChartProps> = ({ data }) => {
  // We map the clauses to two dimensions:
  // X-Axis: Execution/Tactical (Clauses 7 & 8 - Support & Ops)
  // Y-Axis: Strategy/Insight (Clauses 6 & 9 - Planning & Perf)
  
  const executionScore = (data.clause7Score + data.clause8Score) / 2;
  const strategyScore = (data.clause6Score + data.clause9Score) / 2;

  const chartData = [
    { x: executionScore, y: strategyScore, z: 100, name: 'Your Position' }
  ];

  return (
    <div className="w-full h-[350px] bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-2 text-center">Strategic Balance Matrix</h3>
      <p className="text-xs text-slate-400 text-center mb-6">Execution (Cl. 7+8) vs. Strategy (Cl. 6+9)</p>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Execution" 
            domain={[0, 100]} 
            label={{ value: 'Execution Maturity', position: 'bottom', offset: 0, fontSize: 12 }} 
            tick={{fontSize: 12}}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Strategy" 
            domain={[0, 100]} 
            label={{ value: 'Strategic Maturity', angle: -90, position: 'insideLeft', fontSize: 12 }} 
            tick={{fontSize: 12}}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Position" data={chartData} fill="#2563eb">
            <LabelList dataKey="name" position="top" style={{ fontSize: '12px', fill: '#1e293b', fontWeight: 'bold' }} />
          </Scatter>
          {/* Quadrant Backgrounds (Simulated via CSS or ref lines could be added) */}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};