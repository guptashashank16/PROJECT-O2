import React from 'react';
import { Grid } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const ConfusionMatrixCard: React.FC = () => {
  const { benchmarkSummary, selectedModelId, setSelectedModelId } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) return null;

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) return null;

  const currentResult = benchmarkSummary.results[selectedModelId] || results[0];
  if (!currentResult || !currentResult.confusion_matrix) return null;

  const cm = currentResult.confusion_matrix;
  const tp = cm.true_positive ?? 0;
  const tn = cm.true_negative ?? 0;
  const fp = cm.false_positive ?? 0;
  const fn = cm.false_negative ?? 0;
  const total = tp + tn + fp + fn;

  const labels = Array.isArray(cm.labels) ? cm.labels : [];
  const negLabel = labels[0] || 'Normal / Benign';
  const posLabel = labels[1] || 'Diseased / Malignant';

  const tpPct = total > 0 ? ((tp / total) * 100).toFixed(1) : '0.0';
  const tnPct = total > 0 ? ((tn / total) * 100).toFixed(1) : '0.0';
  const fpPct = total > 0 ? ((fp / total) * 100).toFixed(1) : '0.0';
  const fnPct = total > 0 ? ((fn / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="glass-panel-pink rounded-3xl p-5 space-y-4 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <Grid className="w-4 h-4 text-pink-600" />
          <span>Diagnostic Confusion Matrix</span>
        </div>

        {/* Model Switcher */}
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="bg-white border border-pink-200 rounded-xl px-2.5 py-1 text-xs text-pink-700 font-bold focus:outline-none focus:border-pink-500"
        >
          {results.map((r) => (
            <option key={r.model_id} value={r.model_id}>
              {r.model_name ?? r.model_id}
            </option>
          ))}
        </select>
      </div>

      {/* 2x2 Matrix Display */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {/* True Negative (TN) */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block">
            True Negative (TN)
          </span>
          <div className="text-2xl font-black text-emerald-900 font-mono">{tn}</div>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">
            {tnPct}% Correct Normal
          </span>
        </div>

        {/* False Positive (FP) */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold block">
            False Positive (FP)
          </span>
          <div className="text-2xl font-black text-amber-900 font-mono">{fp}</div>
          <span className="text-[10px] text-amber-700 font-mono font-semibold">
            {fpPct}% Type I Error
          </span>
        </div>

        {/* False Negative (FN) */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-rose-800 font-bold block">
            False Negative (FN)
          </span>
          <div className="text-2xl font-black text-rose-900 font-mono">{fn}</div>
          <span className="text-[10px] text-rose-700 font-mono font-semibold">
            {fnPct}% Critical Missed
          </span>
        </div>

        {/* True Positive (TP) */}
        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-pink-800 font-bold block">
            True Positive (TP)
          </span>
          <div className="text-2xl font-black text-pink-900 font-mono">{tp}</div>
          <span className="text-[10px] text-pink-700 font-mono font-semibold">
            {tpPct}% Correct Disease
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 text-center bg-white/90 p-2.5 rounded-xl border border-pink-200 font-medium">
        Positive Class Target: <strong className="text-pink-700 font-mono">{posLabel}</strong> • Negative Class: <strong className="text-slate-800 font-mono">{negLabel}</strong>
      </div>
    </div>
  );
};
