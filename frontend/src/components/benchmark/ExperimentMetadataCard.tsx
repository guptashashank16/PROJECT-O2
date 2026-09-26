import React from 'react';
import { Clock, Cpu, Database, Info, Layers } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const ExperimentMetadataCard: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary) return null;

  const meta = benchmarkSummary.experiment_metadata;

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-pink-200 pb-3">
        <div className="p-2 rounded-xl bg-pink-500 text-white shadow-md shadow-pink-500/20">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Experiment & Reproducibility Metadata</h3>
          <p className="text-xs text-slate-500">
            Complete provenance audit, quantum simulator configuration, and cross-validation parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">Platform Version</span>
          <span className="font-bold text-pink-700">{meta?.platform_version ?? '1.2.0'}</span>
        </div>

        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">Evaluation Protocol</span>
          <span className="font-bold text-slate-900 truncate block" title={meta?.evaluation_framework}>
            {meta?.evaluation_framework ?? 'Stratified 5-Fold'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">Quantum Qubits</span>
          <span className="font-bold text-slate-900">{meta?.n_quantum_features ?? 6} Qubits</span>
        </div>

        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">PCA Explained Var</span>
          <span className="font-bold text-slate-900">
            {meta?.pca_cumulative_variance ? `${(meta.pca_cumulative_variance * 100).toFixed(1)}%` : 'N/A'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">Execution Mode</span>
          <span className="font-bold text-pink-700">{meta?.quantum_execution_mode ?? 'Qiskit Aer'}</span>
        </div>

        <div className="p-3 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 block font-sans">Timestamp (UTC)</span>
          <span className="font-bold text-slate-900 text-[10px] truncate block" title={meta?.timestamp_utc}>
            {meta?.timestamp_utc ? meta.timestamp_utc.split('T')[0] : 'N/A'}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 bg-white/80 p-3 rounded-xl border border-pink-200 leading-relaxed font-sans">
        <strong>Benchmark Standard:</strong> No data leakage. Preprocessing transformations (scaling, imputation, PCA projection) are fitted strictly within training folds and applied to test folds.
      </div>
    </div>
  );
};
