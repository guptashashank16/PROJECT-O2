import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const CalibrationCurveView: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) return null;

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) return null;

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Probability Calibration &amp; Brier Score</h3>
          <p className="text-xs text-slate-500">Assessing estimated disease risk alignment against observed frequencies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {results.map((res) => {
          const m = res.mean_metrics ?? res.metrics;
          const brier = m?.brier_score;
          return (
            <div key={res.model_id} className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 truncate">{res.model_name}</h4>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-600 font-semibold">Brier Score:</span>
                <span className="text-sm font-mono font-bold text-pink-700">
                  {brier !== undefined ? brier.toFixed(4) : 'N/A'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {brier !== undefined && brier < 0.10
                  ? 'Well calibrated risk estimates'
                  : 'Moderate probability calibration margin'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
