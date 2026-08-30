import React from 'react';
import { Award, Table } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { formatPercent, formatScore, formatTime } from '../../utils/formatters';

export const MetricsComparisonTable: React.FC = () => {
  const { benchmarkSummary, selectedModelId, setSelectedModelId } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results) {
    return null;
  }

  const results = Object.values(benchmarkSummary.results);
  if (results.length === 0) {
    return null;
  }

  // Safe max calculations with fallbacks
  const accList = results.map((r) => r.metrics?.accuracy ?? 0);
  const sensList = results.map((r) => r.metrics?.sensitivity ?? 0);
  const aucList = results.map((r) => r.metrics?.roc_auc ?? 0);

  const maxAcc = accList.length > 0 ? Math.max(...accList) : 0;
  const maxSens = sensList.length > 0 ? Math.max(...sensList) : 0;
  const maxAuc = aucList.length > 0 ? Math.max(...aucList) : 0;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Table className="w-4 h-4 text-cyan-400" />
          <span>Clinical Disease Detection Benchmark Results</span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Evaluated on held-out test split ({benchmarkSummary.test_samples_count ?? 0} samples)
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] font-mono border-b border-slate-800">
            <tr>
              <th className="p-3.5">Model</th>
              <th className="p-3.5">Architecture</th>
              <th className="p-3.5">Accuracy</th>
              <th className="p-3.5">Sensitivity (TPR)</th>
              <th className="p-3.5">Specificity (TNR)</th>
              <th className="p-3.5">F1-Score</th>
              <th className="p-3.5">ROC-AUC</th>
              <th className="p-3.5">Training Time</th>
              <th className="p-3.5">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {results.map((r) => {
              const isSelected = selectedModelId === r.model_id;
              const isQuantum = r.model_type === 'quantum';
              const accuracy = r.metrics?.accuracy ?? 0;
              const sensitivity = r.metrics?.sensitivity ?? 0;
              const specificity = r.metrics?.specificity ?? 0;
              const f1 = r.metrics?.f1_score ?? 0;
              const roc_auc = r.metrics?.roc_auc ?? 0;
              const trainTime = r.metrics?.training_time_seconds ?? 0;
              const inferTime = r.metrics?.inference_time_ms ?? 0;

              const isBestAcc = accuracy === maxAcc && maxAcc > 0;
              const isBestSens = sensitivity === maxSens && maxSens > 0;
              const isBestAuc = roc_auc === maxAuc && maxAuc > 0;

              return (
                <tr
                  key={r.model_id}
                  onClick={() => setSelectedModelId(r.model_id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="p-3.5 font-bold text-white font-sans flex items-center gap-2">
                    <span className="truncate">{r.model_name ?? r.model_id}</span>
                    {isQuantum && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Quantum
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-400 font-sans capitalize">{r.model_type ?? 'classical'}</td>

                  {/* Accuracy */}
                  <td className="p-3.5">
                    <span className={`font-semibold ${isBestAcc ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {formatPercent(accuracy)}
                    </span>
                    {isBestAcc && <Award className="w-3 h-3 text-emerald-400 inline ml-1" />}
                  </td>

                  {/* Sensitivity */}
                  <td className="p-3.5">
                    <span className={`font-semibold ${isBestSens ? 'text-cyan-400' : 'text-slate-200'}`}>
                      {formatPercent(sensitivity)}
                    </span>
                    {isBestSens && <Award className="w-3 h-3 text-cyan-400 inline ml-1" />}
                  </td>

                  {/* Specificity */}
                  <td className="p-3.5">
                    <span className="text-slate-300">{formatPercent(specificity)}</span>
                  </td>

                  {/* F1 */}
                  <td className="p-3.5">
                    <span className="text-slate-300">{formatPercent(f1)}</span>
                  </td>

                  {/* ROC-AUC */}
                  <td className="p-3.5">
                    <span className={`font-semibold ${isBestAuc ? 'text-indigo-400' : 'text-slate-200'}`}>
                      {formatScore(roc_auc)}
                    </span>
                    {isBestAuc && <Award className="w-3 h-3 text-indigo-400 inline ml-1" />}
                  </td>

                  {/* Training Time */}
                  <td className="p-3.5 text-slate-400">{formatTime(trainTime)}</td>

                  {/* Inference Latency */}
                  <td className="p-3.5 text-slate-400">{inferTime.toFixed(1)} ms/sample</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
        <div>
          <strong>Medical Metric Definitions:</strong> Sensitivity = TP / (TP + FN) [Disease Detection Rate], Specificity = TN / (TN + FP) [Normal Identification Rate].
        </div>
        <div className="text-slate-400">
          Click any model row to inspect its individual Confusion Matrix & Explainability.
        </div>
      </div>
    </div>
  );
};
