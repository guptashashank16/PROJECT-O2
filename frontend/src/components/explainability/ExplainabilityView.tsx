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
import { Eye } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { QuantumSensitivityChart } from './QuantumSensitivityChart';

export const ExplainabilityView: React.FC = () => {
  const { benchmarkSummary, selectedModelId, setSelectedModelId, explainability } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) return null;

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) return null;

  const isQuantum = selectedModelId === 'vqc';
  const features = Array.isArray(explainability?.features) ? explainability.features : [];

  return (
    <div className="space-y-6">
      {/* Header & Model Selector */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Model Explainability & Feature Sensitivity</h2>
              <p className="text-xs text-slate-400">
                Biological and mathematical attribution for classical baselines & Variational Quantum Classifiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Select Model:</span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
            >
              {results.map((r) => (
                <option key={r.model_id} value={r.model_id}>
                  {r.model_name ?? r.model_id} ({r.model_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Explainability Mode Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Active Method:{' '}
            <strong className="text-white">
              {isQuantum ? 'Quantum Model Feature Sensitivity Analysis' : 'Feature Importance / Permutation Weights'}
            </strong>
          </div>
          {explainability?.interpretation_note && (
            <span className="text-[11px] font-mono text-cyan-400">{explainability.interpretation_note}</span>
          )}
        </div>
      </div>

      {/* Render Quantum or Classical Explainability View */}
      {isQuantum && explainability?.quantum_sensitivity ? (
        <QuantumSensitivityChart data={explainability.quantum_sensitivity} />
      ) : features.length > 0 ? (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {explainability?.model_name ?? 'Model'} — Ranked Feature Importances
          </h3>

          <div className="h-64 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={features.map((f) => ({
                  name: f.feature_name ?? 'Feature',
                  score: f.importance_score ?? 0,
                  percentage: f.relative_percentage ?? 0,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any) => [typeof val === 'number' ? val.toFixed(4) : val, 'Importance Score']}
                />
                <Bar dataKey="score" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {features.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#a78bfa' : '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-400">
          Loading feature importance data...
        </div>
      )}
    </div>
  );
};
