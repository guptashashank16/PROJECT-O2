import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Split, Users } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { api } from '../../services/api';
import { DisagreementAnalysis, DisagreementSample } from '../../types';

export const ModelDisagreementCard: React.FC = () => {
  const { benchmarkSummary } = useAppState();
  const [analysis, setAnalysis] = useState<DisagreementAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<DisagreementSample | null>(null);

  useEffect(() => {
    if (benchmarkSummary) {
      fetchDisagreement();
    }
  }, [benchmarkSummary]);

  const fetchDisagreement = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDisagreementAnalysis();
      // Normalize: backend returns disagreeing_samples, component uses samples
      const normalized: DisagreementAnalysis = {
        ...res,
        samples: res.samples ?? res.disagreeing_samples ?? [],
      };
      // Normalize per-sample alias for quantum_classical_divergent
      if (normalized.samples) {
        normalized.samples = normalized.samples.map((s) => ({
          ...s,
          quantum_classical_divergent: s.quantum_classical_divergent ?? s.is_quantum_classical_disagreement,
        }));
      }
      setAnalysis(normalized);
      if (normalized.samples && normalized.samples.length > 0) {
        const firstDivergent = normalized.samples.find((s) => s.quantum_classical_divergent) || normalized.samples[0];
        setSelectedSample(firstDivergent);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch disagreement analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!benchmarkSummary) return null;

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white">
            <Split className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quantum-Classical Model Disagreement Lab</h3>
            <p className="text-xs text-slate-500">
              Per-sample comparison on held-out test cohort to identify decision boundary divergences
            </p>
          </div>
        </div>

        {analysis && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-xl bg-pink-100 text-pink-700 font-bold border border-pink-300">
              Disagreement Rate: {(analysis.disagreement_rate * 100).toFixed(1)}%
              &nbsp;({analysis.disagreement_count}/{analysis.total_samples})
            </span>
          </div>
        )}
      </div>

      {/* Disagreement Methodology Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Research Note:</strong> Disagreements between VQC and classical models indicate distinct decision
          boundaries. Divergence does <em>not</em> imply quantum superiority; both predictions should be reviewed
          against clinical ground truth.
        </p>
      </div>

      {loading && (
        <div className="text-center py-8 text-xs text-slate-500">Loading disagreement analysis...</div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {analysis && analysis.samples && analysis.samples.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Samples List */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Held-Out Test Samples ({analysis.samples.length})
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-pink-200 max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-pink-50 text-slate-700 font-bold sticky top-0 border-b border-pink-200">
                  <tr>
                    <th className="p-2.5">Sample</th>
                    <th className="p-2.5">True Label</th>
                    <th className="p-2.5">Max Divergence</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100 font-mono text-[11px]">
                  {analysis.samples.map((s) => {
                    const isSelected = selectedSample?.sample_index === s.sample_index;
                    const isDivergent = s.quantum_classical_divergent ?? s.is_quantum_classical_disagreement;

                    return (
                      <tr
                        key={s.sample_index}
                        onClick={() => setSelectedSample(s)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-100/80 border-l-4 border-pink-600 font-bold'
                            : 'bg-white/80 hover:bg-rose-50/50'
                        }`}
                      >
                        <td className="p-2.5 font-sans font-semibold text-slate-900">
                          Sample #{s.sample_index + 1}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {s.true_label !== undefined && s.true_label !== null ? s.true_label : 'N/A'}
                        </td>
                        <td className="p-2.5 text-slate-800">
                          {(s.max_disagreement * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5">
                          {isDivergent ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-100 text-rose-800 font-bold border border-rose-300">
                              Divergent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-medium">
                              Consensus
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Inspection Detail Card */}
          {selectedSample && (
            <div className="p-5 rounded-2xl bg-white/95 border border-pink-300 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-pink-200 pb-2.5">
                <span className="text-xs font-bold text-slate-900">
                  Sample #{selectedSample.sample_index + 1}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Ground Truth: {selectedSample.true_label ?? 'N/A'}
                </span>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Model Probability Predictions
                </h5>

                <div className="space-y-1.5 text-xs">
                  {Object.entries(selectedSample.model_probabilities ?? {}).map(([modelId, prob]) => {
                    const pred = selectedSample.model_predictions?.[modelId];
                    const isQuantum = modelId === 'vqc' || modelId.includes('quantum');
                    return (
                      <div
                        key={modelId}
                        className={`p-2.5 rounded-xl border flex items-center justify-between font-mono ${
                          isQuantum
                            ? 'bg-pink-50 border-pink-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className={`font-bold font-sans capitalize ${isQuantum ? 'text-pink-900' : 'text-slate-700'}`}>
                          {modelId.replace(/_/g, ' ')}
                          {isQuantum && <span className="ml-1 text-[9px] bg-pink-100 text-pink-700 px-1 rounded">QC</span>}
                        </span>
                        <span className={`font-semibold ${isQuantum ? 'text-pink-700' : 'text-slate-900'}`}>
                          {((prob as number) * 100).toFixed(1)}%
                          {pred !== undefined && (
                            <span className="ml-1 text-[10px] text-slate-500">
                              → {pred === 1 ? 'Pos' : 'Neg'}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-pink-50/60 border border-pink-200 text-xs text-slate-600 leading-relaxed">
                <strong>Max Divergence:</strong> {(selectedSample.max_disagreement * 100).toFixed(1)}%
                {(selectedSample.quantum_classical_divergent ?? selectedSample.is_quantum_classical_disagreement) && (
                  <span className="ml-2 text-rose-700 font-bold">⚠ Quantum-Classical Divergence Detected</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {analysis && analysis.samples && analysis.samples.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-2 py-8">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-bold text-slate-800">No Significant Disagreements</p>
          <p className="text-xs text-slate-500">
            All models agree within the {(analysis.disagreement_threshold * 100).toFixed(0)}% threshold.
          </p>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Users className="w-8 h-8 text-slate-300" />
          <p className="text-xs text-slate-500">Disagreement analysis will load automatically after training.</p>
        </div>
      )}
    </div>
  );
};
