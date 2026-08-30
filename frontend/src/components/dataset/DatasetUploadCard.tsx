import React, { useRef } from 'react';
import { Database, FileUp, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const DatasetUploadCard: React.FC = () => {
  const { samples, loadSample, uploadDataset, isLoading, profile } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadDataset(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sample Dataset Loader */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Load Benchmark Sample</h2>
              <p className="text-xs text-slate-400">Pre-bundled clinical benchmark datasets</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Validated
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {samples.map((s) => {
            const isSelected = profile?.dataset_name.includes(s.name) || profile?.dataset_name.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => loadSample(s.id)}
                disabled={isLoading}
                className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between group ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>{s.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{s.description}</p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                    <span>{s.rows} rows</span>
                    <span>•</span>
                    <span>{s.columns} features</span>
                    <span>•</span>
                    <span>Target: {s.suggested_target}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom CSV Uploader */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Upload Custom Tabular Dataset</h2>
              <p className="text-xs text-slate-400">Accepts generic clinical / biomedical CSV files</p>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/30 hover:bg-slate-900/60 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-400 flex items-center justify-center transition border border-slate-700">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              ) : (
                <FolderOpen className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-200">
                Click to browse or drop CSV file here
              </p>
              <p className="text-[11px] text-slate-500">
                Automatic profiling of numerical & categorical columns
              </p>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
          <strong>Dataset-Agnostic Engine:</strong> The pipeline automatically profiles columns, handles missing values, detects identifiers, and normalizes features for quantum circuit synthesis.
        </div>
      </div>
    </div>
  );
};
