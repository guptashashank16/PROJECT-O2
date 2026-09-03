import React, { useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, ChevronUp, Cpu, Gauge, Layers, ShieldCheck, Zap } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const EvidencePanel: React.FC = () => {
  const { benchmarkSummary } = useAppState();
  const [expanded, setExpanded] = useState(true);

  if (!benchmarkSummary || !benchmarkSummary.evidence) {
    return null;
  }

  const evidence = benchmarkSummary.evidence;
  const verdict = evidence.verdict || 'INSUFFICIENT_EVIDENCE';

  const verdictStyles: Record<string, { label: string; bg: string; text: string; border: string }> = {
    QUANTUM_PREFERRED: {
      label: 'QUANTUM PREFERRED',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    QUANTUM_COMPETITIVE: {
      label: 'QUANTUM COMPETITIVE',
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
      border: 'border-pink-500/30',
    },
    CLASSICAL_PREFERRED: {
      label: 'CLASSICAL PREFERRED',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    INSUFFICIENT_EVIDENCE: {
      label: 'INSUFFICIENT EVIDENCE',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
    },
  };

  const currentStyle = verdictStyles[verdict] || verdictStyles.INSUFFICIENT_EVIDENCE;

  const dimensions = [
    { key: 'Performance', data: evidence.performance_evidence, icon: Zap },
    { key: 'Generalization', data: evidence.generalization_evidence, icon: Layers },
    { key: 'Calibration', data: evidence.calibration_evidence, icon: ShieldCheck },
    { key: 'Noise Robustness', data: evidence.robustness_evidence, icon: Cpu },
    { key: 'Resource Cost', data: evidence.resource_evidence, icon: Gauge },
  ];

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-500/30 shadow-xl">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Quantum Evidence Engine</h3>
            <p className="text-xs text-slate-400">5-Dimensional Clinical Utility Verdict</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wider ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
            {currentStyle.label}
          </div>
          <button className="text-slate-400 hover:text-white">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-6 pt-4 border-t border-pink-500/20 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-pink-500/20 space-y-2">
            <h4 className="text-xs font-semibold text-pink-300">Verdict Rationale</h4>
            <p className="text-xs text-slate-200 leading-relaxed">{evidence.verdict_explanation}</p>
          </div>

          {/* 5 Dimensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {dimensions.map(({ key, data, icon: Icon }) => {
              if (!data) return null;
              const isPassed = data.status === 'passed';
              const isWarning = data.status === 'warning';

              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPassed
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : isWarning
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 text-pink-400" />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPassed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isPassed ? '✓ Passed' : isWarning ? '⚠️ Alert' : '• Neutral'}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white mb-1">{key}</h5>
                  <p className="text-[11px] text-slate-400 leading-snug">{data.description}</p>
                </div>
              );
            })}
          </div>

          {/* Transparent Rules Breakdown */}
          {evidence.rule_breakdown && evidence.rule_breakdown.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evaluation Rules Applied</h5>
              <div className="flex flex-wrap gap-2">
                {evidence.rule_breakdown.map((rule: string, i: number) => (
                  <span key={i} className="text-[10px] bg-slate-800/80 text-pink-300 px-2.5 py-1 rounded-lg border border-pink-500/10">
                    • {rule}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
