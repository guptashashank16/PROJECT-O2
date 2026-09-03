import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Play,
  Sparkles,
  Stethoscope,
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
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Dynamic Patient Inference Lab</h2>
            <p className="text-xs text-slate-500">
              Input form automatically generated from <strong className="text-slate-800">{profile.dataset_name}</strong> schema
            </p>
          </div>
        </div>

        {/* Quick Sample Prefills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrefillSample(0)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-pink-200 text-xs text-slate-700 font-bold transition shadow-sm"
          >
            Prefill Sample 1
          </button>
          <button
            type="button"
            onClick={() => handlePrefillSample(1)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-pink-200 text-xs text-slate-700 font-bold transition shadow-sm"
          >
            Prefill Sample 2
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Selection Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-white/90 rounded-2xl border border-pink-200 gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span>Target Diagnostic Model:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full sm:w-64 bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-xs text-pink-700 font-bold focus:outline-none focus:border-pink-500"
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
              <div key={col.name} className="space-y-1 p-3 rounded-2xl bg-white/80 border border-pink-200">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800 truncate max-w-[150px]" title={col.name}>
                    {col.name}
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono font-medium">
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
                    className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none transition font-semibold"
                  />
                ) : col.categories && col.categories.length > 0 ? (
                  <select
                    value={value}
                    onChange={(e) => handleInputChange(col.name, e.target.value)}
                    className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none transition font-semibold"
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
                    className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none transition font-semibold"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Prediction Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-pink-200">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-pink-500/25 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Play className="w-4 h-4 fill-current" />}
            <span>RUN CLINICAL INFERENCE</span>
          </button>
        </div>
      </form>
    </div>
  );
};
