import React, { useState } from 'react';
import { Award, CheckCircle2, Download, FileSpreadsheet, FileText, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { api } from '../../services/api';
import { QuantumUtilityReport } from '../../types';

export const QuantumUtilityReportCard: React.FC = () => {
  const { benchmarkSummary } = useAppState();
  const [report, setReport] = useState<QuantumUtilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!benchmarkSummary) return null;

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getQuantumUtilityReport();
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate utility report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `quantum_utility_report_${report.dataset_name}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quantum Utility & Benchmarking Report</h3>
            <p className="text-xs text-slate-500">
              Exportable scientific evaluation summary and methodological audit for research publications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report ? (
            <>
              <button
                onClick={handleDownloadJson}
                className="px-3.5 py-1.5 rounded-xl border border-pink-200 bg-white text-xs font-semibold text-slate-700 hover:bg-rose-50 flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-pink-600" />
                Export JSON
              </button>
              <a
                href={api.getReportCsvUrl()}
                download={`benchmark_metrics_${benchmarkSummary.dataset_name}.csv`}
                className="px-3.5 py-1.5 rounded-xl border border-pink-200 bg-white text-xs font-semibold text-slate-700 hover:bg-rose-50 flex items-center gap-1.5 transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export CSV
              </a>
            </>
          ) : (
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-md shadow-pink-500/25 hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Synthesizing Report...' : 'Generate Full Report'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {report ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Verdict Banner */}
          <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Overall Benchmark Assessment
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-pink-100 text-pink-700 border border-pink-300">
                {report.benchmark_verdict || report.evidence_verdict || 'EVALUATED'}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {report.verdict_explanation || report.evidence_explanation || report.conclusion}
            </p>
          </div>

          {/* Strengths & Limitations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Quantum Model Observations & Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-800 font-medium list-disc list-inside">
                {(report.quantum_strengths && report.quantum_strengths.length > 0) ? (
                  report.quantum_strengths.map((s, idx) => (
                    <li key={idx} className="leading-snug">{s}</li>
                  ))
                ) : (
                  <li className="leading-snug">Observed VQC held-out metrics evaluated across cross-validation folds.</li>
                )}
              </ul>
            </div>

            {/* Limitations */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Quantum Limitations & NISQ Constraints
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-800 font-medium list-disc list-inside">
                {(report.quantum_limitations && report.quantum_limitations.length > 0) ? (
                  report.quantum_limitations.map((lim, idx) => (
                    <li key={idx} className="leading-snug">{lim}</li>
                  ))
                ) : (
                  <li className="leading-snug">Simulated statevector execution with classical dimensionality constraints.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Methodological Disclaimers List */}
          <div className="p-4 rounded-2xl bg-white/80 border border-pink-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-pink-600" />
              Required Research Disclaimers
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              {(report.methodological_disclaimers && report.methodological_disclaimers.length > 0) ? (
                report.methodological_disclaimers.map((disc, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-pink-600 font-bold">•</span>
                    <span>{disc}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-pink-600 font-bold">•</span>
                  <span>Observational benchmark only. Does not constitute formal clinical proof or quantum advantage.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-500 bg-white/60 rounded-2xl border border-pink-200/80">
          Click <strong>Generate Full Report</strong> above to synthesize the complete clinical utility assessment, strengths/limitations audit, and export JSON/CSV research logs.
        </div>
      )}
    </div>
  );
};
