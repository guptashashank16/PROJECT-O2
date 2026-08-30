import React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Cpu, Info, Sparkles } from 'lucide-react';
import { QuantumSensitivityResult } from '../../types';

interface QuantumSensitivityChartProps {
  data: QuantumSensitivityResult;
}

export const QuantumSensitivityChart: React.FC<QuantumSensitivityChartProps> = ({ data }) => {
  const quantumFeatures = Array.isArray(data?.quantum_features) ? data.quantum_features : [];
  const projectedFeatures = Array.isArray(data?.projected_original_features) ? data.projected_original_features : [];

  const chartData = quantumFeatures.map((f) => ({
    name: f.feature_name ?? 'Qubit Feature',
    sensitivity: f.importance_score ?? 0,
    percentage: f.relative_percentage ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Quantum Feature Sensitivity Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Quantum Circuit Feature Sensitivity Analysis
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Perturbation δ = ±{data?.perturbation_delta ?? 0.05}
          </span>
        </div>

        <div className="h-56 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                formatter={(val: any) => [typeof val === 'number' ? val.toFixed(4) : val, 'Sensitivity Magnitude']}
              />
              <Bar dataKey="sensitivity" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : '#0284c7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Methodology:</strong> Evaluates the rate of change in VQC expectation value ⟨Z₀⟩ across test patients under systematic feature perturbation. Higher sensitivity denotes greater quantum circuit state rotation response.
          </p>
        </div>
      </div>

      {/* Back-Projected Original Clinical Features */}
      {projectedFeatures.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Projected Biological Feature Importance</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Via PCA Inverse Loadings (S · |V|)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectedFeatures.slice(0, 9).map((feat, idx) => (
              <div
                key={feat.feature_name || idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 truncate max-w-[140px]" title={feat.feature_name}>
                    {idx + 1}. {feat.feature_name}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(feat.relative_percentage ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (feat.relative_percentage ?? 0) * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
