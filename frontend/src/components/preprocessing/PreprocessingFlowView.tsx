import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart,
  CheckCircle2,
  Cpu,
  Database,
  Filter,
  GitBranch,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Bar, BarChart as RechartsBar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppState } from '../../context/AppStateContext';
import { PreprocessingRequest } from '../../types';

export const PreprocessingFlowView: React.FC = () => {
  const { profile, config, preprocessingSummary, executePreprocessing, isLoading, setActiveTab } = useAppState();

  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [quantumFeatures, setQuantumFeatures] = useState<number>(6);
  const [scalerType, setScalerType] = useState<'standard' | 'minmax'>('standard');

  const handleRunPreprocessing = async () => {
    const params: PreprocessingRequest = {
      test_split_ratio: testSplit,
      n_quantum_features: quantumFeatures,
      scaler_type: scalerType,
    };
    await executePreprocessing(params);
  };

  const pcaVarianceData = preprocessingSummary
    ? preprocessingSummary.pca_explained_variance_ratio.map((val, idx) => ({
        name: `PC ${idx + 1}`,
        variance: Number((val * 100).toFixed(1)),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Preprocessing & Dimensionality Reduction</h2>
              <p className="text-xs text-slate-400">
                Leakage-free train-only fitting, feature scaling, and PCA compression for quantum circuits
              </p>
            </div>
          </div>

          <button
            onClick={handleRunPreprocessing}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Execute Preprocessing Pipeline</span>
          </button>
        </div>

        {/* Hyperparameters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Test Split Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Test Partition Split</span>
              <span className="font-mono text-cyan-400 font-bold">{(testSplit * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSplit}
              onChange={(e) => setTestSplit(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[10px] text-slate-500">
              Stratified split. Preprocessing fitted strictly on remaining {((1 - testSplit) * 100).toFixed(0)}% train set.
            </p>
          </div>

          {/* Quantum Features Count / Qubits */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Target Quantum Features (Qubits)</span>
              <span className="font-mono text-cyan-400 font-bold">{quantumFeatures} Qubits</span>
            </div>
            <input
              type="range"
              min="4"
              max="8"
              step="1"
              value={quantumFeatures}
              onChange={(e) => setQuantumFeatures(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[10px] text-slate-500">
              PCA projection dimension matching quantum circuit qubit capacity (N = 4 to 8 qubits).
            </p>
          </div>

          {/* Feature Scaling Method */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-300 text-xs block">Numerical Scaler</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScalerType('standard')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                  scalerType === 'standard'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Standard (Z-score)
              </button>
              <button
                type="button"
                onClick={() => setScalerType('minmax')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                  scalerType === 'minmax'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                MinMax [0, 1]
              </button>
            </div>
            <p className="text-[10px] text-slate-500">Applied to continuous numerical clinical features.</p>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Interactive Preprocessing Pipeline Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Raw Tabular Input */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                1. Raw Data Input
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                {profile?.total_columns || 0} Cols
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Excludes {config?.identifier_columns.length || 0} non-predictive identifiers and separates target column.
            </p>
          </div>

          {/* Step 2: Clean & Encode */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                2. Clean & Encode
              </span>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                Impute + OHE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Median imputation for numericals, mode imputation + OneHotEncoder for categoricals.
            </p>
          </div>

          {/* Step 3: Feature Selection */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <BarChart className="w-3.5 h-3.5 text-purple-400" />
                3. Feature Selection
              </span>
              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                ANOVA F-test
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              SelectKBest scores features based on mutual information and variance on train split.
            </p>
          </div>

          {/* Step 4: Quantum Representation */}
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                4. Quantum State Prep
              </span>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40">
                {quantumFeatures} Q-Features
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              PCA compression down to {quantumFeatures} orthogonal components bounded in [0, π].
            </p>
          </div>
        </div>
      </div>

      {/* PCA Explained Variance Chart & Summary */}
      {preprocessingSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Variance Bar Chart */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BarChart className="w-4 h-4 text-cyan-400" />
                PCA Component Explained Variance Ratio
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Cumulative: {(preprocessingSummary.pca_cumulative_variance * 100).toFixed(1)}%
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBar data={pcaVarianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val}%`, 'Variance Explained']}
                  />
                  <Bar dataKey="variance" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                    {pcaVarianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : '#0284c7'} />
                    ))}
                  </Bar>
                </RechartsBar>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dimension Audit Card */}
          <div className="glass-panel rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Feature Dimension Audit
              </h3>
              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Raw Features:</span>
                  <span className="text-white font-bold">{preprocessingSummary.raw_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Encoded Features:</span>
                  <span className="text-white font-bold">{preprocessingSummary.encoded_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Selected Features:</span>
                  <span className="text-white font-bold">{preprocessingSummary.selected_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Quantum PCA Components:</span>
                  <span className="text-cyan-400 font-bold">{preprocessingSummary.quantum_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-400">
                  <span>Train / Test Split:</span>
                  <span className="text-slate-200 font-bold">
                    {preprocessingSummary.train_samples} / {preprocessingSummary.test_samples}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('training')}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20"
            >
              <span>Configure & Train Models</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
