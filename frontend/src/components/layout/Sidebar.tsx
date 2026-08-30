import React from 'react';
import {
  Activity,
  BarChart3,
  Binary,
  Cpu,
  Database,
  Eye,
  GitBranch,
  Layers,
  Sparkles,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { TabType, useAppState } from '../../context/AppStateContext';

interface NavItem {
  id: TabType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  ready: boolean;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, profile, preprocessingSummary, benchmarkSummary } = useAppState();

  const navItems: NavItem[] = [
    {
      id: 'dataset',
      label: 'Dataset & Profiling',
      sublabel: 'Upload, inspect & configure',
      icon: Database,
      ready: true,
    },
    {
      id: 'preprocessing',
      label: 'Preprocessing Flow',
      sublabel: 'Leakage-free PCA reduction',
      icon: GitBranch,
      ready: Boolean(profile),
      badge: preprocessingSummary ? `${preprocessingSummary.quantum_feature_count} Q-Features` : undefined,
    },
    {
      id: 'training',
      label: 'Quantum & ML Setup',
      sublabel: 'VQC ansatz & classical models',
      icon: Cpu,
      ready: Boolean(profile),
    },
    {
      id: 'benchmark',
      label: 'Benchmark & Metrics',
      sublabel: 'Accuracy, Sensitivity & AUC',
      icon: BarChart3,
      ready: Boolean(benchmarkSummary),
      badge: benchmarkSummary ? 'Trained' : undefined,
    },
    {
      id: 'explainability',
      label: 'Explainability & Sensitivity',
      sublabel: 'Quantum gradient perturbation',
      icon: Eye,
      ready: Boolean(benchmarkSummary),
    },
    {
      id: 'prediction',
      label: 'Patient Prediction Lab',
      sublabel: 'Dynamic real-time inference',
      icon: Stethoscope,
      ready: Boolean(benchmarkSummary),
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isEnabled = item.ready;

          return (
            <button
              key={item.id}
              onClick={() => isEnabled && setActiveTab(item.id)}
              disabled={!isEnabled}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 group ${
                isActive
                  ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-sm shadow-cyan-500/10'
                  : isEnabled
                  ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                  : 'text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : isEnabled
                      ? 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'
                      : 'bg-slate-900 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold tracking-tight truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.sublabel}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                    isActive
                      ? 'bg-cyan-400/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <div className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Quantum Backend</span>
            <span className="text-cyan-400 font-mono text-[10px]">Qiskit 1.0</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Simulated statevectors on local CPU. Zero data leakage enforced.
          </p>
        </div>
      </div>
    </aside>
  );
};
