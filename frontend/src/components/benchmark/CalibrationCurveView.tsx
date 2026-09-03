import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const CalibrationCurveView: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary) return null;

  const results = Object.values(benchmarkSummary.results);

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-500/30 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Probability Calibration & Brier Score</h3>
          <p className="text-xs text-slate-400">Assessing estimated disease risk alignment against observed frequencies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {results.map((res) => (
          <div key={res.model_id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white truncate">{res.model_name}</h4>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400">Brier Score:</span>
              <span className="text-sm font-mono font-bold text-pink-400">
                {res.metrics.brier_score !== undefined ? res.metrics.brier_score.toFixed(4) : 'N/A'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              {res.metrics.brier_score !== undefined && res.metrics.brier_score < 0.10
                ? 'Well calibrated risk estimates'
                : 'Moderate probability calibration margin'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
