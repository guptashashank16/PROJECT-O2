import React from 'react';
import { AlertCircle, CheckCircle2, Cpu, HelpCircle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const NoisyComparisonCard: React.FC = () => {
  const { benchmarkSummary } = useAppState();

  if (!benchmarkSummary || !benchmarkSummary.results.vqc || !benchmarkSummary.noisy_vqc_result) {
    return null;
  }

  const ideal = benchmarkSummary.results.vqc.mean_metrics || benchmarkSummary.results.vqc.metrics;
  const noisy = benchmarkSummary.noisy_vqc_result.mean_metrics || benchmarkSummary.noisy_vqc_result.metrics;
  const noiseInfo = benchmarkSummary.noisy_vqc_result.noise_info;

  const retentionAuc = ((noisy.roc_auc / Math.max(0.01, ideal.roc_auc)) * 100).toFixed(1);
  const retentionF1 = ((noisy.f1_score / Math.max(0.01, ideal.f1_score)) * 100).toFixed(1);

  const isRealAer = noiseInfo?.is_real_aer ?? true;

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Ideal vs. Noisy Quantum Stress Test</h3>
            <p className="text-xs text-slate-500">
              {isRealAer
                ? 'Simulated Qiskit Aer Depolarizing & Readout Noise Model'
                : 'Analytical Mathematical Fallback Simulation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRealAer ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aer Circuit Noise Model
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Mathematical Fallback
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">ROC-AUC Performance Retention</span>
            <span className="font-bold text-pink-700">{retentionAuc}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, parseFloat(retentionAuc))}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">F1 Score Performance Retention</span>
            <span className="font-bold text-pink-700">{retentionF1}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, parseFloat(retentionF1))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-pink-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-pink-50/80 text-slate-700 font-bold">
            <tr>
              <th className="p-3">Quantum Simulation Variant</th>
              <th className="p-3">ROC-AUC</th>
              <th className="p-3">PR-AUC</th>
              <th className="p-3">Sensitivity</th>
              <th className="p-3">F1 Score</th>
              <th className="p-3">Brier Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100 text-slate-800 font-medium font-mono">
            <tr className="bg-white">
              <td className="p-3 font-bold text-pink-700 font-sans">Ideal VQC (Statevector / Shot-Noise Free)</td>
              <td className="p-3">{ideal.roc_auc.toFixed(4)}</td>
              <td className="p-3">{ideal.pr_auc ? ideal.pr_auc.toFixed(4) : 'N/A'}</td>
              <td className="p-3">{ideal.sensitivity.toFixed(4)}</td>
              <td className="p-3">{ideal.f1_score.toFixed(4)}</td>
              <td className="p-3">{ideal.brier_score !== undefined ? ideal.brier_score.toFixed(4) : 'N/A'}</td>
            </tr>
            <tr className="bg-rose-50/50">
              <td className="p-3 font-bold text-rose-700 font-sans">
                {isRealAer ? 'Noisy VQC (Aer Depolarizing + Readout)' : 'Noisy VQC (Mathematical Fallback)'}
              </td>
              <td className="p-3">{noisy.roc_auc.toFixed(4)}</td>
              <td className="p-3">{noisy.pr_auc ? noisy.pr_auc.toFixed(4) : 'N/A'}</td>
              <td className="p-3">{noisy.sensitivity.toFixed(4)}</td>
              <td className="p-3">{noisy.f1_score.toFixed(4)}</td>
              <td className="p-3">{noisy.brier_score !== undefined ? noisy.brier_score.toFixed(4) : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/80 border border-pink-200 text-[11px] text-slate-600 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {noiseInfo?.methodology_disclaimer ||
            'Noise modeling simulates gate depolarizing error (1% 1q, 3% 2q) and readout error (2%) in Qiskit Aer. This is a simulated noise benchmark, not physical quantum processor execution.'}
        </p>
      </div>
    </div>
  );
};
