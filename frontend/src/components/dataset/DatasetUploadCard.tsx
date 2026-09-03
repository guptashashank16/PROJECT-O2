import React, { useRef } from 'react';
import { Database, FileUp, FolderOpen, Loader2 } from 'lucide-react';
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
      <div className="glass-panel-pink rounded-3xl p-6 space-y-4 border border-pink-300 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Load Benchmark Sample</h2>
              <p className="text-xs text-slate-500">Pre-bundled clinical benchmark datasets</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300">
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
                className={`p-3.5 rounded-2xl border text-left transition flex items-start justify-between group ${
                  isSelected
                    ? 'bg-rose-100/80 border-pink-400 text-slate-900 shadow-sm'
                    : 'bg-white/80 border-pink-200 text-slate-700 hover:border-pink-300 hover:bg-rose-50/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-2">
                    <span>{s.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-ping" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight font-medium">{s.description}</p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono font-medium">
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
      <div className="glass-panel-pink rounded-3xl p-6 space-y-4 flex flex-col justify-between border border-pink-300 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Custom Tabular Dataset</h2>
              <p className="text-xs text-slate-500">Accepts generic clinical / biomedical CSV files</p>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-pink-300 hover:border-pink-500 bg-white/60 hover:bg-rose-50/60 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-pink-50 group-hover:bg-pink-100 text-pink-600 flex items-center justify-center transition border border-pink-200">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
              ) : (
                <FolderOpen className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drop CSV file here
              </p>
              <p className="text-[11px] text-slate-500">
                Automatic profiling of numerical & categorical columns
              </p>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 bg-white/80 p-3 rounded-xl border border-pink-200 font-medium leading-relaxed">
          <strong>Dataset-Agnostic Engine:</strong> The pipeline automatically profiles columns, handles missing values, detects identifiers, and normalizes features for quantum circuit synthesis.
        </div>
      </div>
    </div>
  );
};
