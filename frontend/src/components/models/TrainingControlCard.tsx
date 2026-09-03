import React from 'react';
import {
  CheckCircle2,
  Loader2,
  Play,
  Sparkles,
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
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="w-4 h-4 text-pink-600" />
            Hybrid Benchmarking Execution
          </h3>
          <p className="text-xs text-slate-500">
            Executes simultaneous training of classical baselines and variational quantum classifier (VQC)
          </p>
        </div>

        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className={`px-8 py-3.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2.5 shadow-xl ${
            isTraining
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02]'
          }`}
        >
          {isTraining ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isTraining ? 'Training in Progress...' : 'TRAIN & BENCHMARK MODELS'}</span>
        </button>
      </div>

      {/* Real-Time Progress Steps */}
      {trainingStatus && (
        <div className="space-y-4 pt-2 border-t border-pink-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-bold flex items-center gap-2">
              <span>Current Status:</span>
              <strong className="text-pink-700 font-mono">{trainingStatus.current_step}</strong>
            </span>
            <span className="font-mono text-pink-700 font-bold">{trainingStatus.overall_progress}%</span>
          </div>

          <div className="w-full h-2 bg-pink-100 rounded-full overflow-hidden border border-pink-200">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-300 rounded-full"
              style={{ width: `${trainingStatus.overall_progress}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {trainingStatus.steps.map((step) => {
              const isDone = step.status === 'completed';
              const isRunning = step.status === 'running';

              return (
                <div
                  key={step.name}
                  className={`p-3 rounded-xl border transition ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isRunning
                      ? 'bg-pink-50 border-pink-300 text-pink-800 animate-pulse'
                      : 'bg-white/80 border-pink-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="truncate">{step.name}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-pink-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono font-medium">
                    <span>{step.status}</span>
                    {step.message && <span className="text-pink-700 font-bold">{step.message}</span>}
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
