import React, { useEffect, useState } from 'react';
import { Cpu, Gauge, HelpCircle, Layers, ShieldAlert, Zap } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { api } from '../../services/api';
import { ResourceProfile } from '../../types';

export const ResourceProfileCard: React.FC = () => {
  const { benchmarkSummary } = useAppState();
  const [profile, setProfile] = useState<ResourceProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const active = await api.getActiveExperiment();
        if (active && active.experiment_id) {
          const res = await api.getExperimentResourceProfile(active.experiment_id);
          setProfile(res);
        }
      } catch (err: any) {
        console.warn('Resource profile not ready yet:', err);
      } finally {
        setLoading(false);
      }
    };

    if (benchmarkSummary) {
      fetchProfile();
    }
  }, [benchmarkSummary]);

  if (!benchmarkSummary && !profile) return null;

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Computational Resource & Scalability Profile</h3>
            <p className="text-xs text-slate-500">
              Exact circuit dimensions, empirical simulation latencies, and dimensional compression ratios
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-pink-700 bg-pink-100 px-3 py-1 rounded-full font-bold border border-pink-300">
          Empirical Research Measurements
        </span>
      </div>

      {profile ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section 1: Quantum Circuit Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-pink-600" />
              Quantum Architecture & Statevector Runtime
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Qubits ($N$)</span>
                <span className="text-base font-bold text-pink-700">{profile.quantum_resources.qubit_count} Qubits</span>
                <span className="text-[9px] text-slate-400 block font-sans">Circuit Register Width</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Circuit Depth</span>
                <span className="text-base font-bold text-slate-900">{profile.quantum_resources.circuit_depth} Layers</span>
                <span className="text-[9px] text-slate-400 block font-sans">2-Qubit Entanglement</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Trainable Angles ($\theta$)</span>
                <span className="text-base font-bold text-pink-700">{profile.quantum_resources.parameter_count}</span>
                <span className="text-[9px] text-slate-400 block font-sans">Variational Parameters</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Optimization Steps</span>
                <span className="text-base font-bold text-slate-900">{profile.quantum_resources.optimization_iterations}</span>
                <span className="text-[9px] text-slate-400 block font-sans">COBYLA / SLSQP budget</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Simulation Runtime</span>
                <span className="text-base font-bold text-pink-700">{profile.quantum_resources.simulation_time_seconds}s</span>
                <span className="text-[9px] text-slate-400 block font-sans">Local CPU Execution</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 border border-pink-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 block font-sans">Inference Latency</span>
                <span className="text-base font-bold text-slate-900">{profile.quantum_resources.inference_latency_ms} ms</span>
                <span className="text-[9px] text-slate-400 block font-sans">Per-patient evaluation</span>
              </div>
            </div>
          </div>

          {/* Section 2: Classical Baselines & Dataset Compression */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classical Baselines Resource Table */}
            <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-pink-600" />
                Classical Models Runtime Comparison
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-slate-500 uppercase border-b border-pink-100">
                    <tr>
                      <th className="pb-1.5 font-sans">Model</th>
                      <th className="pb-1.5">Train Time</th>
                      <th className="pb-1.5">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50 text-[11px]">
                    {profile.classical_resources.map((c) => (
                      <tr key={c.model_id}>
                        <td className="py-2 font-sans font-semibold text-slate-800">{c.model_name}</td>
                        <td className="py-2">{c.training_time_seconds}s</td>
                        <td className="py-2">{c.inference_latency_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dimensionality & Compression Card */}
            <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-pink-600" />
                Dimensionality Reduction & Compression
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-pink-50/60 border border-pink-100">
                  <span className="text-[10px] text-slate-500 font-sans block">Raw Clinical Features:</span>
                  <span className="font-bold text-slate-900">{profile.dataset_resources.raw_columns} columns</span>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-50/60 border border-pink-100">
                  <span className="text-[10px] text-slate-500 font-sans block">Quantum PCA Qubits:</span>
                  <span className="font-bold text-pink-700">{profile.dataset_resources.pca_dimensions} Qubits</span>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-50/60 border border-pink-100 col-span-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-sans">Feature Compression Ratio:</span>
                  <span className="font-bold text-pink-800 text-sm">
                    {profile.dataset_resources.dimension_compression_ratio}x reduction
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytical vs Configured Explanation */}
          <div className="p-3.5 rounded-2xl bg-white/80 border border-pink-200 text-[11px] text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{profile.measured_vs_configured_notes}</p>
          </div>

          {/* Scalability Research Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Scalability & Hardware Caveat:</strong> {profile.scalability_disclaimer}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-500 bg-white/60 rounded-2xl border border-pink-200">
          Train models in the Quantum & ML Setup tab to compute and inspect the full computational resource profile.
        </div>
      )}
    </div>
  );
};
