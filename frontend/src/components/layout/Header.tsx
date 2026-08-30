import React from 'react';
import { Activity, Cpu, Database, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const Header: React.FC = () => {
  const { profile, isBackendOnline, trainingStatus } = useAppState();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
          <Cpu className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Hybrid Quantum-Classical Disease Detection
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              VQC + Classical Baselines
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Tabular Clinical Disease Benchmarking & Quantum Feature Sensitivity
          </p>
        </div>
      </div>

      {/* Status Badges & Quick Links */}
      <div className="flex items-center gap-3">
        {/* Active Dataset Pill */}
        {profile && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium truncate max-w-[180px]">{profile.dataset_name}</span>
            <span className="text-slate-500 font-mono">({profile.total_rows} rows)</span>
          </div>
        )}

        {/* Training indicator */}
        {trainingStatus?.is_training && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            <span>{trainingStatus.current_step} ({trainingStatus.overall_progress}%)</span>
          </div>
        )}

        {/* Backend Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isBackendOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
          <span>{isBackendOnline ? 'Backend Online' : 'Backend Offline'}</span>
        </div>

        {/* OpenAPI / Swagger Docs Link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-medium"
          title="Open FastAPI Swagger Interactive API Docs"
        >
          <span>Swagger API</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>
    </header>
  );
};
