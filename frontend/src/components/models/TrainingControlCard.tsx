import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ClassicalModelConfig, QuantumModelConfig } from '../../types';

interface TrainingControlCardProps {
  quantumConfig: QuantumModelConfig;
  classicalConfig: ClassicalModelConfig;
}

export const TrainingControlCard: React.FC<TrainingControlCardProps> = ({
  quantumConfig,
  classicalConfig,
}) => {
  const { triggerTraining, trainingStatus, isLoading } = useAppState();

  const handleStartTraining = () => {
    triggerTraining({
      quantum_config: quantumConfig,
      classical_config: classicalConfig,
    });
  };

  const isTraining = trainingStatus?.is_training || isLoading;

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Hybrid Benchmarking Execution
          </h3>
          <p className="text-xs text-slate-400">
            Executes simultaneous training of classical baselines and variational quantum classifier (VQC)
          </p>
        </div>

        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className={`px-8 py-3.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2.5 shadow-xl ${
            isTraining
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]'
          }`}
        >
          {isTraining ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isTraining ? 'Training in Progress...' : 'TRAIN & BENCHMARK MODELS'}</span>
        </button>
      </div>

      {/* Real-Time Progress Steps */}
      {trainingStatus && (
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-2">
              <span>Current Status:</span>
              <strong className="text-cyan-400 font-mono">{trainingStatus.current_step}</strong>
            </span>
            <span className="font-mono text-cyan-400 font-bold">{trainingStatus.overall_progress}%</span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300 rounded-full"
              style={{ width: `${trainingStatus.overall_progress}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {trainingStatus.steps.map((step, idx) => {
              const isDone = step.status === 'completed';
              const isRunning = step.status === 'running';

              return (
                <div
                  key={step.name}
                  className={`p-3 rounded-xl border transition ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isRunning
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 animate-pulse'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="truncate">{step.name}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>{step.status}</span>
                    {step.message && <span className="text-cyan-400 font-bold">{step.message}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
