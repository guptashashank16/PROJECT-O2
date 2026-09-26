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
import { Eye, HelpCircle, Info } from 'lucide-react';
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
      <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Model Explainability & Feature Sensitivity</h2>
              <p className="text-xs text-slate-500">
                Biological and mathematical attribution for classical baselines & Variational Quantum Classifiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold">Select Model:</span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-xs text-pink-700 font-bold focus:outline-none focus:border-pink-500"
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
        <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">
              Method: {explainability?.method_name || (isQuantum ? 'Quantum Feature Sensitivity Analysis' : 'Feature Importance')}
            </span>
            <span className="text-[10px] text-pink-700 font-mono font-bold bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
              {explainability?.model_type ? explainability.model_type.toUpperCase() : 'MODEL'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
            {explainability?.method_description || (isQuantum ? 'Finite difference perturbation on VQC quantum state expectation values.' : 'Model-specific feature ranking.')}
          </p>
        </div>
      </div>

      {/* Render Quantum or Classical Explainability View */}
      {isQuantum && explainability?.quantum_sensitivity ? (
        <QuantumSensitivityChart data={explainability.quantum_sensitivity} />
      ) : features.length > 0 ? (
        <div className="glass-panel-pink rounded-3xl p-5 space-y-4 border border-pink-300 shadow-xl">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
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
                <YAxis dataKey="name" type="category" stroke="#334155" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f472b6', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }}
                  formatter={(val: any) => [typeof val === 'number' ? val.toFixed(4) : val, 'Importance Score']}
                />
                <Bar dataKey="score" fill="#ec4899" radius={[0, 4, 4, 0]}>
                  {features.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#f472b6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass-panel-pink rounded-3xl p-8 text-center text-xs text-slate-500 border border-pink-300 font-medium">
          Loading feature importance data...
        </div>
      )}

      {/* Methodological Limitations Banner */}
      {explainability?.limitations && (
        <div className="p-4 rounded-2xl bg-white/80 border border-pink-200 text-xs text-slate-600 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Methodology Note:</strong> {explainability.limitations}
          </p>
        </div>
      )}
    </div>
  );
};
