import React, { useEffect, useState } from 'react';
import { Award, CheckSquare, GitCompare, HelpCircle, Layers, RefreshCw, Square } from 'lucide-react';
import { api } from '../../services/api';
import { ExperimentComparisonResponse, ExperimentSummary } from '../../types';

export const ExperimentComparisonView: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ExperimentComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const list = await api.listExperiments();
      setExperiments(list);
      // Select first 2-3 experiments by default if none selected
      if (selectedIds.length === 0 && list.length > 0) {
        const initial = list.slice(0, 3).map((e) => e.experiment_id);
        setSelectedIds(initial);
      }
    } catch (err: any) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0) {
      runComparison(selectedIds);
    } else {
      setComparison(null);
    }
  }, [selectedIds]);

  const runComparison = async (ids: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareExperiments(ids);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare experiments');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel-pink rounded-3xl p-6 space-y-5 border border-pink-300 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Experiment Benchmarking Comparison</h3>
              <p className="text-xs text-slate-500">
                Empirical side-by-side analysis of quantum circuit configurations and classical baselines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              {selectedIds.length} of {experiments.length} selected
            </span>
          </div>
        </div>

        {/* Experiment Selector Checkboxes */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Select Experiments to Benchmark Side-by-Side:
          </span>
          <div className="flex flex-wrap gap-2">
            {experiments.map((exp) => {
              const isSelected = selectedIds.includes(exp.experiment_id);

              return (
                <button
                  key={exp.experiment_id}
                  onClick={() => toggleSelect(exp.experiment_id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    isSelected
                      ? 'bg-rose-100/90 border-pink-400 text-pink-800 shadow-sm font-bold'
                      : 'bg-white/80 border-pink-200 text-slate-600 hover:bg-rose-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-pink-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{exp.experiment_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Comparison Table */}
      {comparison && comparison.experiments.length > 0 && (
        <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="overflow-x-auto rounded-2xl border border-pink-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-pink-50 text-slate-700 font-mono text-[11px] uppercase tracking-wider border-b border-pink-200">
                <tr>
                  <th className="p-3.5">Experiment & Dataset</th>
                  <th className="p-3.5">Circuit Configuration</th>
                  <th className="p-3.5">VQC ROC-AUC (Mean ± SD)</th>
                  <th className="p-3.5">VQC Sensitivity</th>
                  <th className="p-3.5">VQC Specificity</th>
                  <th className="p-3.5">VQC Brier</th>
                  <th className="p-3.5">Best Classical AUC</th>
                  <th className="p-3.5">Noisy Retention</th>
                  <th className="p-3.5">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100 font-mono text-[11px]">
                {comparison.experiments.map((exp) => (
                  <tr key={exp.experiment_id} className="bg-white/80 hover:bg-rose-50/50 transition">
                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-slate-900 truncate max-w-[180px]" title={exp.experiment_name}>
                        {exp.experiment_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {exp.dataset_name} • {exp.experiment_id}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{exp.n_qubits} Qubits ({exp.ansatz})</div>
                      <div className="text-[10px] text-slate-500">
                        {exp.feature_map} • {exp.ansatz_layers} Layers • {exp.vqc_parameter_count ?? 'N/A'} params
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-pink-700 text-xs">
                        {exp.vqc_auc_mean !== null && exp.vqc_auc_mean !== undefined ? exp.vqc_auc_mean.toFixed(4) : 'Pending'}
                      </span>
                      {exp.vqc_auc_std && exp.vqc_auc_std > 0 && (
                        <span className="text-[10px] text-slate-500 ml-1">±{exp.vqc_auc_std.toFixed(3)}</span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-800">
                      {exp.vqc_sensitivity !== null && exp.vqc_sensitivity !== undefined
                        ? `${(exp.vqc_sensitivity * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>

                    <td className="p-3.5 text-slate-800">
                      {exp.vqc_specificity !== null && exp.vqc_specificity !== undefined
                        ? `${(exp.vqc_specificity * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>

                    <td className="p-3.5 text-slate-800">
                      {exp.vqc_brier !== null && exp.vqc_brier !== undefined ? exp.vqc_brier.toFixed(4) : 'N/A'}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-900">
                        {exp.best_classical_auc !== null && exp.best_classical_auc !== undefined
                          ? exp.best_classical_auc.toFixed(4)
                          : 'N/A'}
                      </span>
                      {exp.best_classical_model && (
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-[120px]">
                          {exp.best_classical_model}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {exp.noisy_auc_retention_percent !== null && exp.noisy_auc_retention_percent !== undefined ? (
                        <span className="font-bold text-pink-700">{exp.noisy_auc_retention_percent}%</span>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="p-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                        {exp.verdict || 'EVALUATING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-white/80 border border-pink-200 text-[11px] text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
            <span>{comparison.neutral_empirical_notes}</span>
          </div>
        </div>
      )}
    </div>
  );
};
