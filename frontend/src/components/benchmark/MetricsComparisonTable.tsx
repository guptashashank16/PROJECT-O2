import React from 'react';
import { Award, Table } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { formatPercent, formatScore, formatTime } from '../../utils/formatters';
import { EvidencePanel } from './EvidencePanel';
import { NoisyComparisonCard } from './NoisyComparisonCard';
import { CalibrationCurveView } from './CalibrationCurveView';

export const MetricsComparisonTable: React.FC = () => {
  const { benchmarkSummary, selectedModelId, setSelectedModelId } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) {
    return null;
  }

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) {
    return null;
  }

  const accList = results.map((r) => r.metrics?.accuracy ?? 0);
  const sensList = results.map((r) => r.metrics?.sensitivity ?? 0);
  const aucList = results.map((r) => r.metrics?.roc_auc ?? 0);

  const maxAcc = accList.length > 0 ? Math.max(...accList) : 0;
  const maxSens = sensList.length > 0 ? Math.max(...sensList) : 0;
  const maxAuc = aucList.length > 0 ? Math.max(...aucList) : 0;

  return (
    <div className="space-y-8">
      {/* 1. Evidence Engine Summary Banner */}
      <EvidencePanel />

      {/* 2. Comparative Benchmark Table */}
      <div className="glass-panel-pink rounded-3xl overflow-hidden space-y-4 p-6 border border-pink-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-500/20 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Table className="w-4 h-4 text-pink-400" />
            <span>Stratified 5-Fold Cross-Validation Benchmark</span>
          </div>
          <div className="text-xs text-pink-300/80 font-mono">
            {benchmarkSummary.evaluation_mode} ({benchmarkSummary.test_samples_count ?? 0} samples/fold)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3.5">Model</th>
                <th className="p-3.5">Architecture</th>
                <th className="p-3.5">ROC-AUC (Mean ± SD)</th>
                <th className="p-3.5">PR-AUC</th>
                <th className="p-3.5">Sensitivity</th>
                <th className="p-3.5">Specificity</th>
                <th className="p-3.5">F1-Score</th>
                <th className="p-3.5">Brier Score</th>
                <th className="p-3.5">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {results.map((r) => {
                const isSelected = selectedModelId === r.model_id;
                const isQuantum = r.model_type === 'quantum';
                
                const meanMetrics = r.mean_metrics || r.metrics;
                const stdMetrics = r.std_metrics;

                const accuracy = meanMetrics?.accuracy ?? 0;
                const sensitivity = meanMetrics?.sensitivity ?? 0;
                const specificity = meanMetrics?.specificity ?? 0;
                const f1 = meanMetrics?.f1_score ?? 0;
                const roc_auc = meanMetrics?.roc_auc ?? 0;
                const pr_auc = meanMetrics?.pr_auc ?? 0;
                const brier = meanMetrics?.brier_score ?? 0;
                const inferTime = meanMetrics?.inference_time_ms ?? 0;

                const isBestAcc = accuracy === maxAcc && maxAcc > 0;
                const isBestSens = sensitivity === maxSens && maxSens > 0;
                const isBestAuc = roc_auc === maxAuc && maxAuc > 0;

                return (
                  <tr
                    key={r.model_id}
                    onClick={() => setSelectedModelId(r.model_id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-pink-500/10 border-l-4 border-pink-400'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-white font-sans flex items-center gap-2">
                      <span className="truncate">{r.model_name ?? r.model_id}</span>
                      {isQuantum && (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/40">
                          Quantum VQC
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 font-sans capitalize">{r.model_type ?? 'classical'}</td>

                    {/* ROC-AUC */}
                    <td className="p-3.5">
                      <span className={`font-semibold ${isBestAuc ? 'text-pink-400' : 'text-slate-200'}`}>
                        {formatScore(roc_auc)}
                      </span>
                      {stdMetrics && stdMetrics.roc_auc > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">±{stdMetrics.roc_auc.toFixed(3)}</span>
                      )}
                      {isBestAuc && <Award className="w-3 h-3 text-pink-400 inline ml-1" />}
                    </td>

                    {/* PR-AUC */}
                    <td className="p-3.5 text-slate-300">{formatScore(pr_auc)}</td>

                    {/* Sensitivity */}
                    <td className="p-3.5">
                      <span className={`font-semibold ${isBestSens ? 'text-rose-400' : 'text-slate-200'}`}>
                        {formatPercent(sensitivity)}
                      </span>
                      {stdMetrics && stdMetrics.sensitivity > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">±{stdMetrics.sensitivity.toFixed(3)}</span>
                      )}
                    </td>

                    {/* Specificity */}
                    <td className="p-3.5 text-slate-300">{formatPercent(specificity)}</td>

                    {/* F1 */}
                    <td className="p-3.5 text-slate-300">{formatPercent(f1)}</td>

                    {/* Brier Score */}
                    <td className="p-3.5 text-slate-300">{brier.toFixed(4)}</td>

                    {/* Inference Latency */}
                    <td className="p-3.5 text-slate-400">{inferTime.toFixed(1)} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <div>
            <strong>Evaluation Standards:</strong> Leakage-safe 5-Fold Stratified Cross-Validation. Metrics reported as Mean ± SD across folds.
          </div>
          <div className="text-pink-300/80">
            Click any row to view model-specific Confusion Matrix & Explainability.
          </div>
        </div>
      </div>

      {/* 3. Ideal vs. Noisy VQC Stress Test */}
      <NoisyComparisonCard />

      {/* 4. Probability Calibration Analysis */}
      <CalibrationCurveView />
    </div>
  );
};
