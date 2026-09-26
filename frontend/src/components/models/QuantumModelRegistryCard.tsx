import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Cpu, Info, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { QuantumModelMetadata } from '../../types';

export const QuantumModelRegistryCard: React.FC = () => {
  const [models, setModels] = useState<QuantumModelMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const list = await api.getQuantumModels();
        setModels(list);
      } catch (err: any) {
        console.warn('Could not fetch quantum models registry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
      <div className="flex items-center justify-between border-b border-pink-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pink-500 text-white shadow-md shadow-pink-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quantum Classifier Architecture Catalog</h3>
            <p className="text-xs text-slate-500">
              Active benchmark architectures and planned research extensions
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-pink-700 font-bold">
          Q-CARE Model Registry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {models.map((m) => {
          const isImplemented = m.implemented;

          return (
            <div
              key={m.model_id}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                isImplemented
                  ? 'bg-white/95 border-pink-300 shadow-md ring-1 ring-pink-500/20'
                  : 'bg-slate-50/70 border-slate-200 opacity-80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  {isImplemented ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Planned
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">{m.description}</p>
              </div>

              <div className="pt-2 border-t border-pink-100/80 space-y-1.5 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block font-sans text-[10px]">Circuit Family:</span>
                  <span className="text-slate-800 font-medium">{m.circuit_family}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px]">Theoretical Notes:</span>
                  <span className="text-slate-600 text-[10px] font-sans leading-tight block">
                    {m.theoretical_notes}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-white/70 rounded-xl border border-pink-200 text-[11px] text-slate-600 leading-relaxed font-sans">
        <strong>Research Integrity Policy:</strong> Only genuinely implemented models execute during benchmarking. Unimplemented model types are clearly labeled as planned extensions without silent fallback.
      </div>
    </div>
  );
};
