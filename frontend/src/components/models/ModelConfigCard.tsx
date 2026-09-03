import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { ClassicalModelConfig, QuantumModelConfig } from '../../types';

interface ModelConfigCardProps {
  quantumConfig: QuantumModelConfig;
  setQuantumConfig: React.Dispatch<React.SetStateAction<QuantumModelConfig>>;
  classicalConfig: ClassicalModelConfig;
  setClassicalConfig: React.Dispatch<React.SetStateAction<ClassicalModelConfig>>;
  disabled?: boolean;
}

export const ModelConfigCard: React.FC<ModelConfigCardProps> = ({
  quantumConfig,
  setQuantumConfig,
  classicalConfig,
  setClassicalConfig,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quantum VQC Architecture Configuration */}
      <div className="lg:col-span-2 glass-panel-pink rounded-3xl p-6 space-y-5 border border-pink-300 shadow-xl">
        <div className="flex items-center justify-between border-b border-pink-200 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Variational Quantum Classifier (VQC)</h2>
              <p className="text-xs text-slate-500">Parameterized Quantum Circuit (PQC) & Ansatz</p>
            </div>
          </div>

          {/* Fast Demo Mode Toggle */}
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setQuantumConfig((prev) => ({ ...prev, fast_demo_mode: !prev.fast_demo_mode }))
            }
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
              quantumConfig.fast_demo_mode
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-pink-200 text-slate-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast Demo Mode: {quantumConfig.fast_demo_mode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Qubits */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Qubit Count ($N$)</span>
              <span className="font-mono text-pink-700 font-bold">{quantumConfig.n_qubits} Qubits</span>
            </div>
            <select
              disabled={disabled}
              value={quantumConfig.n_qubits}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, n_qubits: parseInt(e.target.value, 10) }))
              }
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500 font-mono"
            >
              {[4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} Qubits ({n} PCA Dimensions)
                </option>
              ))}
            </select>
          </div>

          {/* Feature Map */}
          <div className="space-y-1.5">
            <span className="text-slate-700 font-bold text-xs block">Quantum Feature Map</span>
            <select
              disabled={disabled}
              value={quantumConfig.feature_map}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, feature_map: e.target.value }))
              }
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500 font-mono"
            >
              <option value="ZZFeatureMap">ZZFeatureMap (Entangled 2-Qubit Interactions)</option>
              <option value="AngleEncoding">AngleEncoding (Single-Qubit Ry Rotations)</option>
            </select>
          </div>

          {/* Variational Ansatz */}
          <div className="space-y-1.5">
            <span className="text-slate-700 font-bold text-xs block">Variational Ansatz</span>
            <select
              disabled={disabled}
              value={quantumConfig.ansatz}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, ansatz: e.target.value }))
              }
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500 font-mono"
            >
              <option value="RealAmplitudes">RealAmplitudes (Ry + Linear Entanglement)</option>
              <option value="EfficientSU2">EfficientSU2 (Ry + Rz + Linear Entanglement)</option>
            </select>
          </div>

          {/* Ansatz Repetitions / Layers */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Ansatz Layers ($L$)</span>
              <span className="font-mono text-pink-700 font-bold">{quantumConfig.ansatz_layers} Layers</span>
            </div>
            <select
              disabled={disabled}
              value={quantumConfig.ansatz_layers}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, ansatz_layers: parseInt(e.target.value, 10) }))
              }
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500 font-mono"
            >
              {[1, 2, 3, 4].map((l) => (
                <option key={l} value={l}>
                  {l} {l === 1 ? 'Layer' : 'Layers'} (Shallow Depth)
                </option>
              ))}
            </select>
          </div>

          {/* Classical Optimizer */}
          <div className="space-y-1.5">
            <span className="text-slate-700 font-bold text-xs block">Classical Optimizer</span>
            <select
              disabled={disabled}
              value={quantumConfig.optimizer}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, optimizer: e.target.value }))
              }
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500 font-mono"
            >
              <option value="COBYLA">COBYLA (Derivative-Free Trust Region)</option>
              <option value="SLSQP">SLSQP (Sequential Least Squares)</option>
              <option value="SPSA">SPSA (Simultaneous Perturbation)</option>
            </select>
          </div>

          {/* Max Iterations */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Max Optimization Iterations</span>
              <span className="font-mono text-pink-700 font-bold">{quantumConfig.max_iterations} Iterations</span>
            </div>
            <input
              type="range"
              disabled={disabled}
              min="10"
              max="80"
              step="5"
              value={quantumConfig.max_iterations}
              onChange={(e) =>
                setQuantumConfig((prev) => ({ ...prev, max_iterations: parseInt(e.target.value, 10) }))
              }
              className="w-full h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
          </div>
        </div>

        <div className="p-3 bg-white/80 rounded-xl border border-pink-200 text-[11px] text-slate-600 leading-relaxed font-medium">
          <strong>Quantum Simulation Guarantee:</strong> Fast Demo Mode runs actual statevector evaluations on local CPU. It optimizes iteration budgets without replacing execution with precomputed or fake metrics.
        </div>
      </div>

      {/* Classical Baselines Panel */}
      <div className="glass-panel-pink rounded-3xl p-6 space-y-4 flex flex-col justify-between border border-pink-300 shadow-xl">
        <div className="space-y-4">
          <div className="border-b border-pink-200 pb-3.5">
            <h2 className="text-sm font-bold text-slate-900">Classical Baselines</h2>
            <p className="text-xs text-slate-500">Benchmark models trained on identical split</p>
          </div>

          <div className="space-y-3">
            {/* Logistic Regression */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-pink-200 cursor-pointer hover:border-pink-400 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">Logistic Regression</span>
                <span className="text-[10px] text-slate-500 font-medium">Linear L2 baseline with balanced class weights</span>
              </div>
              <input
                type="checkbox"
                disabled={disabled}
                checked={classicalConfig.logistic_regression}
                onChange={(e) =>
                  setClassicalConfig((prev) => ({ ...prev, logistic_regression: e.target.checked }))
                }
                className="w-4 h-4 text-pink-600 bg-white border-pink-300 rounded focus:ring-pink-500"
              />
            </label>

            {/* Random Forest */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-pink-200 cursor-pointer hover:border-pink-400 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">Random Forest</span>
                <span className="text-[10px] text-slate-500 font-medium">Non-linear ensemble (100 decision trees)</span>
              </div>
              <input
                type="checkbox"
                disabled={disabled}
                checked={classicalConfig.random_forest}
                onChange={(e) =>
                  setClassicalConfig((prev) => ({ ...prev, random_forest: e.target.checked }))
                }
                className="w-4 h-4 text-pink-600 bg-white border-pink-300 rounded focus:ring-pink-500"
              />
            </label>

            {/* SVM */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-pink-200 cursor-pointer hover:border-pink-400 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">Support Vector Machine (SVM)</span>
                <span className="text-[10px] text-slate-500 font-medium">RBF kernel with Platt probability calibration</span>
              </div>
              <input
                type="checkbox"
                disabled={disabled}
                checked={classicalConfig.svm}
                onChange={(e) =>
                  setClassicalConfig((prev) => ({ ...prev, svm: e.target.checked }))
                }
                className="w-4 h-4 text-pink-600 bg-white border-pink-300 rounded focus:ring-pink-500"
              />
            </label>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono font-medium">
          All models share identical random seed ($S=42$) and evaluated on held-out test split.
        </div>
      </div>
    </div>
  );
};
