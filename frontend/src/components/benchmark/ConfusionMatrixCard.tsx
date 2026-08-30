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
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Grid className="w-4 h-4 text-cyan-400" />
          <span>Diagnostic Confusion Matrix</span>
        </div>

        {/* Model Switcher */}
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-medium focus:outline-none focus:border-cyan-500"
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
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
            True Negative (TN)
          </span>
          <div className="text-2xl font-black text-white font-mono">{tn}</div>
          <span className="text-[10px] text-emerald-400/80 font-mono">
            {tnPct}% Correct Normal
          </span>
        </div>

        {/* False Positive (FP) */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
            False Positive (FP)
          </span>
          <div className="text-2xl font-black text-white font-mono">{fp}</div>
          <span className="text-[10px] text-amber-400/80 font-mono">
            {fpPct}% Type I Error
          </span>
        </div>

        {/* False Negative (FN) */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block">
            False Negative (FN)
          </span>
          <div className="text-2xl font-black text-white font-mono">{fn}</div>
          <span className="text-[10px] text-rose-400/80 font-mono">
            {fnPct}% Critical Missed
          </span>
        </div>

        {/* True Positive (TP) */}
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
            True Positive (TP)
          </span>
          <div className="text-2xl font-black text-white font-mono">{tp}</div>
          <span className="text-[10px] text-cyan-400/80 font-mono">
            {tpPct}% Correct Disease
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 text-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
        Positive Class Target: <strong className="text-cyan-300 font-mono">{posLabel}</strong> • Negative Class: <strong className="text-slate-300 font-mono">{negLabel}</strong>
      </div>
    </div>
  );
};
