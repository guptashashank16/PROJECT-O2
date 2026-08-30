import React, { useEffect, useState } from 'react';
import {
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const DynamicPatientForm: React.FC = () => {
  const { profile, config, benchmarkSummary, selectedModelId, setSelectedModelId, runPrediction, isLoading } = useAppState();
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Initialize form with median or first sample values from profile
  useEffect(() => {
    if (profile && profile.columns) {
      const initial: Record<string, any> = {};
      const excluded = new Set([
        ...(config?.identifier_columns || []),
        ...(config?.excluded_features || []),
        config?.target_column,
      ]);

      profile.columns.forEach((col) => {
        if (!excluded.has(col.name)) {
          if (col.inferred_type === 'numerical') {
            initial[col.name] = col.median_value !== null && col.median_value !== undefined ? col.median_value : 0;
          } else if (col.categories && col.categories.length > 0) {
            initial[col.name] = col.categories[0];
          } else {
            initial[col.name] = '';
          }
        }
      });
      setFormData(initial);
    }
  }, [profile, config]);

  if (!profile) return null;

  const excluded = new Set([
    ...(config?.identifier_columns || []),
    ...(config?.excluded_features || []),
    config?.target_column,
  ]);
  const activeFeatures = profile.columns.filter((c) => !excluded.has(c.name));

  const handleInputChange = (colName: string, val: any) => {
    setFormData((prev) => ({ ...prev, [colName]: val }));
  };

  const handlePrefillSample = (rowIndex: number = 0) => {
    if (profile.preview_rows && profile.preview_rows[rowIndex]) {
      const sample = profile.preview_rows[rowIndex];
      const updated: Record<string, any> = {};
      activeFeatures.forEach((col) => {
        updated[col.name] = sample[col.name] !== undefined ? sample[col.name] : formData[col.name];
      });
      setFormData(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runPrediction(formData, selectedModelId);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Dynamic Patient Inference Lab</h2>
            <p className="text-xs text-slate-400">
              Input form automatically generated from <strong className="text-slate-200">{profile.dataset_name}</strong> schema
            </p>
          </div>
        </div>

        {/* Quick Sample Prefills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrefillSample(0)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
          >
            Prefill Sample 1
          </button>
          <button
            type="button"
            onClick={() => handlePrefillSample(1)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
          >
            Prefill Sample 2
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Selection Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Target Diagnostic Model:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
            >
              {benchmarkSummary ? (
                Object.values(benchmarkSummary.results).map((r) => (
                  <option key={r.model_id} value={r.model_id}>
                    {r.model_name} ({r.model_type.toUpperCase()})
                  </option>
                ))
              ) : (
                <option value="vqc">Variational Quantum Classifier (VQC)</option>
              )}
            </select>
          </div>
        </div>

        {/* Dynamically Rendered Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-1">
          {activeFeatures.map((col) => {
            const isNumerical = col.inferred_type === 'numerical';
            const value = formData[col.name] !== undefined ? formData[col.name] : '';

            return (
              <div key={col.name} className="space-y-1 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-300 truncate max-w-[150px]" title={col.name}>
                    {col.name}
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isNumerical ? 'numeric' : 'categorical'}
                  </span>
                </div>

                {isNumerical ? (
                  <input
                    type="number"
                    step="any"
                    value={value}
                    onChange={(e) => handleInputChange(col.name, parseFloat(e.target.value) || 0)}
                    placeholder={`e.g. ${col.median_value ?? 0}`}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none transition"
                  />
                ) : col.categories && col.categories.length > 0 ? (
                  <select
                    value={value}
                    onChange={(e) => handleInputChange(col.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none transition"
                  >
                    {col.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(col.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none transition"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Prediction Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>RUN CLINICAL INFERENCE</span>
          </button>
        </div>
      </form>
    </div>
  );
};
