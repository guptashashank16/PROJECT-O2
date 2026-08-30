import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const StatusBanner: React.FC = () => {
  const { error, clearError, trainingStatus, isBackendOnline } = useAppState();

  if (!isBackendOnline) {
    return (
      <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-rose-300 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Backend Unreachable:</strong> FastAPI server is not responding at{' '}
            <code className="bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-200">http://localhost:8000</code>.
            Ensure the backend is running.
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-rose-300 text-xs animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={clearError}
          className="p-1 hover:bg-rose-500/20 rounded text-rose-400 hover:text-rose-200 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (trainingStatus?.is_training) {
    return (
      <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-6 py-2.5 flex items-center justify-between text-cyan-300 text-xs animate-pulse">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          <span>
            <strong>Training Active:</strong> {trainingStatus.current_step} — {trainingStatus.overall_progress}% completed.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
