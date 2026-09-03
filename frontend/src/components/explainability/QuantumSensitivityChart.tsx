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
      <div className="glass-panel-pink rounded-3xl p-5 space-y-4 border border-pink-300 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-200 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quantum Circuit Feature Sensitivity Analysis
            </h3>
          </div>
          <span className="text-[11px] font-mono text-pink-700 font-bold bg-pink-100 px-2 py-0.5 rounded border border-pink-300">
            Perturbation δ = ±{data?.perturbation_delta ?? 0.05}
          </span>
        </div>

        <div className="h-56 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="#334155" fontSize={11} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f472b6', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }}
                formatter={(val: any) => [typeof val === 'number' ? val.toFixed(4) : val, 'Sensitivity Magnitude']}
              />
              <Bar dataKey="sensitivity" fill="#ec4899" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#f472b6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="text-[11px] text-slate-600 bg-white/90 p-3 rounded-xl border border-pink-200 flex items-start gap-2 font-medium leading-relaxed">
          <Info className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
          <p>
            <strong>Methodology:</strong> Evaluates the rate of change in VQC expectation value ⟨Z₀⟩ across test patients under systematic feature perturbation. Higher sensitivity denotes greater quantum circuit state rotation response.
          </p>
        </div>
      </div>

      {/* Back-Projected Original Clinical Features */}
      {projectedFeatures.length > 0 && (
        <div className="glass-panel-pink rounded-3xl p-5 space-y-4 border border-pink-300 shadow-xl">
          <div className="flex items-center justify-between border-b border-pink-200 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <span>Projected Biological Feature Importance</span>
            </div>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Via PCA Inverse Loadings (S · |V|)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectedFeatures.slice(0, 9).map((feat, idx) => (
              <div
                key={feat.feature_name || idx}
                className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate max-w-[140px]" title={feat.feature_name}>
                    {idx + 1}. {feat.feature_name}
                  </span>
                  <span className="font-mono text-pink-700 font-bold">
                    {(feat.relative_percentage ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-full"
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
