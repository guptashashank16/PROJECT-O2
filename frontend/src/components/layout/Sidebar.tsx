import React from 'react';
import {
  BarChart3,
  Cpu,
  Database,
  Eye,
  Gauge,
  GitBranch,
  GitCompare,
  Layers,
  Stethoscope,
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
  const { activeTab, setActiveTab, profile, preprocessingSummary, benchmarkSummary, experiments, activeExperiment } = useAppState();

  const navItems: NavItem[] = [
    {
      id: 'dataset',
      label: 'Dataset & Profiling',
      sublabel: 'Ingest, audit & configure',
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
      sublabel: 'VQC ansatz & model catalog',
      icon: Cpu,
      ready: Boolean(profile),
    },
    {
      id: 'benchmark',
      label: 'Benchmark & Evidence',
      sublabel: '5-fold CV & Aer noise test',
      icon: BarChart3,
      ready: Boolean(benchmarkSummary),
      badge: benchmarkSummary ? 'Trained' : undefined,
    },
    {
      id: 'explainability',
      label: 'Explainability & Sensitivity',
      sublabel: 'Quantum circuit perturbations',
      icon: Eye,
      ready: Boolean(benchmarkSummary),
    },
    {
      id: 'prediction',
      label: 'Patient Lab & What-If',
      sublabel: 'Dynamic inference & sensitivity',
      icon: Stethoscope,
      ready: Boolean(benchmarkSummary),
    },
    {
      id: 'resources',
      label: 'Resource & Scalability',
      sublabel: 'Circuit depth & CPU latency',
      icon: Gauge,
      ready: Boolean(benchmarkSummary),
    },
    {
      id: 'comparison',
      label: 'Experiment Comparison',
      sublabel: 'Multi-experiment benchmark',
      icon: GitCompare,
      ready: experiments.length > 0,
      badge: experiments.length > 0 ? `${experiments.length} Runs` : undefined,
    },
    {
      id: 'hardware',
      label: 'Hardware & QASM 3.0',
      sublabel: 'IBM Cloud & circuit export',
      icon: Layers,
      ready: true,
      badge: 'IBM Q',
    },
  ];

  return (
    <aside className="w-64 border-r border-pink-200/60 bg-white/70 backdrop-blur-md p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Research Navigation
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
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all duration-150 group ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-300 text-pink-700 font-bold shadow-sm shadow-pink-500/5'
                  : isEnabled
                  ? 'text-slate-600 hover:bg-rose-50/60 hover:text-slate-900 border border-transparent'
                  : 'text-slate-400 cursor-not-allowed border border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25'
                      : isEnabled
                      ? 'bg-pink-50 text-pink-600 group-hover:bg-pink-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold tracking-tight truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.sublabel}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                    isActive
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-slate-100 text-slate-500'
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
      <div className="pt-4 border-t border-pink-200/60 space-y-2">
        <div className="px-3 py-2.5 rounded-xl bg-pink-50/60 border border-pink-200/80 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center justify-between text-slate-900 font-semibold">
            <span>Active Experiment</span>
            <span className="text-pink-600 font-mono text-[10px] truncate max-w-[80px]">
              {activeExperiment?.experiment_id || 'exp-active'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight truncate">
            {activeExperiment?.experiment_name || 'Wisconsin Baseline'}
          </p>
        </div>
      </div>
    </aside>
  );
};
