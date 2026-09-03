import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart,
  Cpu,
  Database,
  Filter,
  GitBranch,
  Layers,
  Loader2,
  Play,
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
      <div className="glass-panel-pink rounded-3xl p-6 space-y-5 border border-pink-300 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Preprocessing & Dimensionality Reduction</h2>
              <p className="text-xs text-slate-500">
                Leakage-free train-only fitting, feature scaling, and PCA compression for quantum circuits
              </p>
            </div>
          </div>

          <button
            onClick={handleRunPreprocessing}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-pink-500/25 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
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
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-800">Test Partition Split</span>
              <span className="font-mono text-pink-700 font-bold">{(testSplit * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSplit}
              onChange={(e) => setTestSplit(parseFloat(e.target.value))}
              className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
            <p className="text-[10px] text-slate-500 font-medium">
              Stratified split. Preprocessing fitted strictly on remaining {((1 - testSplit) * 100).toFixed(0)}% train set.
            </p>
          </div>

          {/* Quantum Features Count / Qubits */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-800">Target Quantum Features (Qubits)</span>
              <span className="font-mono text-pink-700 font-bold">{quantumFeatures} Qubits</span>
            </div>
            <input
              type="range"
              min="4"
              max="8"
              step="1"
              value={quantumFeatures}
              onChange={(e) => setQuantumFeatures(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
            <p className="text-[10px] text-slate-500 font-medium">
              PCA projection dimension matching quantum circuit qubit capacity (N = 4 to 8 qubits).
            </p>
          </div>

          {/* Feature Scaling Method */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 text-xs block">Numerical Scaler</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScalerType('standard')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  scalerType === 'standard'
                    ? 'bg-rose-100 border-pink-300 text-pink-800'
                    : 'bg-white border-pink-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard (Z-score)
              </button>
              <button
                type="button"
                onClick={() => setScalerType('minmax')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  scalerType === 'minmax'
                    ? 'bg-rose-100 border-pink-300 text-pink-800'
                    : 'bg-white border-pink-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                MinMax [0, 1]
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Applied to continuous numerical clinical features.</p>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="glass-panel-pink rounded-3xl p-6 space-y-6 border border-pink-300 shadow-xl">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-600" />
          Interactive Preprocessing Pipeline Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Raw Tabular Input */}
          <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                1. Raw Data Input
              </span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                {profile?.total_columns || 0} Cols
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Excludes {config?.identifier_columns.length || 0} non-predictive identifiers and separates target column.
            </p>
          </div>

          {/* Step 2: Clean & Encode */}
          <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                2. Clean & Encode
              </span>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                Impute + OHE
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Median imputation for numericals, mode imputation + OneHotEncoder for categoricals.
            </p>
          </div>

          {/* Step 3: Feature Selection */}
          <div className="p-4 rounded-2xl bg-white/90 border border-pink-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <BarChart className="w-3.5 h-3.5 text-purple-600" />
                3. Feature Selection
              </span>
              <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                ANOVA F-test
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              SelectKBest scores features based on mutual information and variance on train split.
            </p>
          </div>

          {/* Step 4: Quantum Representation */}
          <div className="p-4 rounded-2xl bg-pink-100/70 border border-pink-300 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-pink-900">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-pink-600" />
                4. Quantum State Prep
              </span>
              <span className="text-[10px] font-mono bg-pink-200 text-pink-800 px-1.5 py-0.5 rounded border border-pink-300 font-bold">
                {quantumFeatures} Q-Features
              </span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
              PCA compression down to {quantumFeatures} orthogonal components bounded in [0, π].
            </p>
          </div>
        </div>
      </div>

      {/* PCA Explained Variance Chart & Summary */}
      {preprocessingSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Variance Bar Chart */}
          <div className="lg:col-span-2 glass-panel-pink rounded-3xl p-5 space-y-3 border border-pink-300 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart className="w-4 h-4 text-pink-600" />
                PCA Component Explained Variance Ratio
              </h3>
              <span className="text-xs font-mono text-pink-700 font-bold">
                Cumulative: {(preprocessingSummary.pca_cumulative_variance * 100).toFixed(1)}%
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBar data={pcaVarianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f472b6', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                    formatter={(val: number) => [`${val}%`, 'Variance Explained']}
                  />
                  <Bar dataKey="variance" fill="#ec4899" radius={[4, 4, 0, 0]}>
                    {pcaVarianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#f472b6'} />
                    ))}
                  </Bar>
                </RechartsBar>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dimension Audit Card */}
          <div className="glass-panel-pink rounded-3xl p-5 space-y-3.5 flex flex-col justify-between border border-pink-300 shadow-xl">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Feature Dimension Audit
              </h3>
              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-pink-200 text-slate-600">
                  <span>Raw Features:</span>
                  <span className="text-slate-900 font-bold">{preprocessingSummary.raw_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pink-200 text-slate-600">
                  <span>Encoded Features:</span>
                  <span className="text-slate-900 font-bold">{preprocessingSummary.encoded_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pink-200 text-slate-600">
                  <span>Selected Features:</span>
                  <span className="text-slate-900 font-bold">{preprocessingSummary.selected_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pink-200 text-slate-600">
                  <span>Quantum PCA Components:</span>
                  <span className="text-pink-700 font-bold">{preprocessingSummary.quantum_feature_count}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Train / Test Split:</span>
                  <span className="text-slate-900 font-bold">
                    {preprocessingSummary.train_samples} / {preprocessingSummary.test_samples}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('training')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-pink-500/20"
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
