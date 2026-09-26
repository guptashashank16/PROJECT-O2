import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu, HelpCircle, RefreshCw, Sliders } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { api } from '../../services/api';
import { WhatIfPerturbation, WhatIfResponse } from '../../types';

interface WhatIfLabCardProps {
  baseFeatures: Record<string, any>;
}

export const WhatIfLabCard: React.FC<WhatIfLabCardProps> = ({ baseFeatures }) => {
  const { benchmarkSummary } = useAppState();
  const [perturbations, setPerturbations] = useState<Record<string, number>>({});
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!benchmarkSummary) return null;

  const featureKeys = Object.keys(baseFeatures).filter(
    (k) =>
      baseFeatures[k] !== undefined &&
      baseFeatures[k] !== null &&
      (typeof baseFeatures[k] === 'number' || !isNaN(Number(baseFeatures[k])))
  );

  const handleSliderChange = (featName: string, val: number) => {
    setPerturbations((prev) => ({
      ...prev,
      [featName]: val,
    }));
  };

  const handleReset = () => {
    setPerturbations({});
    setResult(null);
    setError(null);
  };

  const handleRunWhatIf = async () => {
    const perturbationList: WhatIfPerturbation[] = Object.entries(perturbations).map(
      ([feature_name, new_value]) => ({
        feature_name,
        new_value: Number(new_value),
      })
    );

    if (perturbationList.length === 0) {
      setError('Please modify at least one feature using the sliders below to run sensitivity analysis.');
      return;
    }

    const featureChanges = Object.entries(perturbations).map(([feature_name, new_val]) => {
      const orig = Number(baseFeatures[feature_name]) || 0;
      return {
        feature_name,
        delta_type: 'absolute' as const,
        delta_value: Number(new_val) - orig,
      };
    });

    try {
      setLoading(true);
      setError(null);
      const res = await api.analyzeWhatIf({
        base_features: baseFeatures,
        perturbations: perturbationList,
        feature_changes: featureChanges,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'What-if analysis execution failed');
    } finally {
      setLoading(false);
    }
  };

  const modelList =
    result?.models && Object.keys(result.models).length > 0
      ? Object.values(result.models)
      : result?.results && result.results.length > 0
      ? result.results[0].model_results.map((mr) => ({
          model_id: mr.model_id,
          model_name: mr.model_name,
          base_probability_positive: mr.baseline_probability,
          perturbed_probability_positive: mr.modified_probability,
          delta_probability: mr.delta,
          label_changed: (mr.baseline_probability >= 0.5) !== (mr.modified_probability >= 0.5),
        }))
      : [];

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">What-If Sensitivity Simulation</h3>
            <p className="text-xs text-slate-500">
              Perturb clinical features and measure output probability delta across all trained models
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white text-xs font-semibold text-slate-600 hover:bg-rose-50 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleRunWhatIf}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
            Run Sensitivity Check
          </button>
        </div>
      </div>

      {/* Methodological Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Non-Causal Sensitivity Disclaimer:</strong> This tool performs purely observational sensitivity testing on the fitted statistical model. Perturbing a feature does <em>not</em> imply medical causality or clinical intervention outcomes.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Feature Perturbation Sliders */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Adjust Feature Values (Demonstration Subset)
        </h4>

        {featureKeys.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-white/60 rounded-xl border border-pink-200/80">
            No adjustable numeric features detected in active patient input.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureKeys.slice(0, 6).map((k) => {
              const originalVal = Number(baseFeatures[k]) || 0;
              const currentVal = perturbations[k] !== undefined ? perturbations[k] : originalVal;
              let min = 0;
              let max = 100;
              if (originalVal === 0) {
                min = -10;
                max = 10;
              } else if (originalVal > 0) {
                min = Math.max(0, parseFloat((originalVal * 0.4).toFixed(2)));
                max = parseFloat((originalVal * 1.8).toFixed(2));
              } else {
                min = parseFloat((originalVal * 1.8).toFixed(2));
                max = parseFloat((originalVal * 0.4).toFixed(2));
              }
              if (min === max) {
                min = originalVal - 10;
                max = originalVal + 10;
              }
              const step = parseFloat(((max - min) / 100).toFixed(3)) || 0.1;

              const isModified = perturbations[k] !== undefined && perturbations[k] !== originalVal;

              return (
                <div
                  key={k}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isModified ? 'bg-pink-50/70 border-pink-300 shadow-sm' : 'bg-white/80 border-pink-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 truncate" title={k}>
                      {k}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">Orig: {originalVal.toFixed(2)}</span>
                      <ArrowRight className="w-3 h-3 text-pink-500" />
                      <span className={`font-bold ${isModified ? 'text-pink-700' : 'text-slate-700'}`}>
                        {currentVal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentVal}
                    onChange={(e) => handleSliderChange(k, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Comparison Grid */}
      {result && modelList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-pink-200 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Cross-Model Output Sensitivity
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {modelList.map((m) => {
              const delta = m.delta_probability;
              const isIncrease = delta > 0.001;
              const isDecrease = delta < -0.001;
              const isVqc = m.model_id === 'vqc';

              return (
                <div
                  key={m.model_id}
                  className={`p-4 rounded-2xl border ${
                    isVqc
                      ? 'bg-rose-50/80 border-pink-300 shadow-md'
                      : 'bg-white/90 border-pink-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{m.model_name}</span>
                    {isVqc && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-300">
                        VQC
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                      <span>Base Prob:</span>
                      <span>{(m.base_probability_positive * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold font-mono text-[11px]">
                      <span>Perturbed:</span>
                      <span className="text-pink-700">{(m.perturbed_probability_positive * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-pink-100 text-[11px] font-mono">
                      <span className="text-slate-500">Δ Probability:</span>
                      <span
                        className={`font-bold ${
                          isIncrease ? 'text-rose-600' : isDecrease ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        {isIncrease ? '+' : ''}
                        {(delta * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {m.label_changed && (
                    <div className="mt-2 text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-1 rounded-lg border border-amber-300 text-center">
                      ⚠️ Class Decision Flipped!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

