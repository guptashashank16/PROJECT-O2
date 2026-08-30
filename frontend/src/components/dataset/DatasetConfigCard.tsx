import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Hash, Save, Settings2, SlidersHorizontal, Tag } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const DatasetConfigCard: React.FC = () => {
  const { profile, config, saveConfig, setActiveTab, isLoading } = useAppState();

  const [targetCol, setTargetCol] = useState<string>('');
  const [positiveClass, setPositiveClass] = useState<string>('');
  const [identifierCols, setIdentifierCols] = useState<string[]>([]);
  const [problemType, setProblemType] = useState<string>('binary_classification');

  useEffect(() => {
    if (config) {
      setTargetCol(config.target_column);
      setPositiveClass(config.positive_class);
      setIdentifierCols(config.identifier_columns);
      setProblemType(config.problem_type);
    } else if (profile) {
      setTargetCol(profile.suggested_target || '');
      setPositiveClass(profile.suggested_positive_class || '');
      setIdentifierCols(profile.suggested_identifiers || []);
    }
  }, [config, profile]);

  if (!profile) return null;

  const targetColumnProfile = profile.columns.find((c) => c.name === targetCol);
  const targetClasses = targetColumnProfile?.categories || 
    (profile.target_distribution ? profile.target_distribution.map(d => d.class_label) : []);

  const handleToggleIdentifier = (colName: string) => {
    setIdentifierCols((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const handleSave = async () => {
    if (!targetCol) return;
    await saveConfig({
      target_column: targetCol,
      positive_class: positiveClass,
      identifier_columns: identifierCols,
      excluded_features: [],
      problem_type: problemType,
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Dataset Configuration</h2>
            <p className="text-xs text-slate-400">
              Customize target variable, positive diagnostic class, and non-predictive identifiers
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || !targetCol}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Configuration</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Target Column Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Column</span>
          </label>
          <select
            value={targetCol}
            onChange={(e) => {
              const newTarget = e.target.value;
              setTargetCol(newTarget);
              const foundCol = profile.columns.find((c) => c.name === newTarget);
              if (foundCol && foundCol.categories && foundCol.categories.length > 0) {
                setPositiveClass(foundCol.categories[0]);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono"
          >
            {profile.columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} {c.is_candidate_target ? '(Suggested Target)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">The outcome variable predicted by ML & VQC.</p>
        </div>

        {/* 2. Positive Class Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Positive Diagnostic Class</span>
          </label>
          <select
            value={positiveClass}
            onChange={(e) => setPositiveClass(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono"
          >
            {targetClasses.length > 0 ? (
              targetClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} (Label: 1 / Diseased)
                </option>
              ))
            ) : (
              <option value={positiveClass}>{positiveClass || 'Class 1'}</option>
            )}
          </select>
          <p className="text-[10px] text-slate-500">
            Designates the disease/malignant label for Sensitivity calculation.
          </p>
        </div>

        {/* 3. Problem Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Problem Type</span>
          </label>
          <select
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
          >
            <option value="binary_classification">Binary Classification (Disease / Normal)</option>
          </select>
          <p className="text-[10px] text-slate-500">V1 engine specializes in clinical binary risk classification.</p>
        </div>
      </div>

      {/* 4. Identifier Columns Selection */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-purple-400" />
            <span>Excluded Identifier Columns (Prevent Data Leakage)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {identifierCols.length} columns excluded from model training
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.columns
            .filter((c) => c.name !== targetCol)
            .map((c) => {
              const isExcluded = identifierCols.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleToggleIdentifier(c.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
                    isExcluded
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isExcluded ? 'bg-purple-400' : 'bg-slate-600'}`} />
                  <span>{c.name}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Next Step Action CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
        <span className="text-slate-400">
          Ready to run data cleaning, imputation, and PCA feature reduction.
        </span>
        <button
          onClick={() => {
            handleSave();
            setActiveTab('preprocessing');
          }}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition flex items-center gap-2 border border-slate-700"
        >
          <span>Proceed to Preprocessing Flow</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>
    </div>
  );
};
