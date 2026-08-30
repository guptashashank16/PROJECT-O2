import React, { useState } from 'react';
import {
  BarChart3,
  Cpu,
  Database,
  Eye,
  GitBranch,
  Stethoscope,
} from 'lucide-react';
import { useAppState } from './context/AppStateContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBanner } from './components/layout/StatusBanner';
import { MedicalDisclaimer } from './components/layout/MedicalDisclaimer';

import { DatasetUploadCard } from './components/dataset/DatasetUploadCard';
import { DatasetProfileCard } from './components/dataset/DatasetProfileCard';
import { DatasetConfigCard } from './components/dataset/DatasetConfigCard';
import { PreprocessingFlowView } from './components/preprocessing/PreprocessingFlowView';
import { ModelConfigCard } from './components/models/ModelConfigCard';
import { TrainingControlCard } from './components/models/TrainingControlCard';
import { MetricsComparisonTable } from './components/benchmark/MetricsComparisonTable';
import { MetricsRadarChart } from './components/benchmark/MetricsRadarChart';
import { RocCurvesView } from './components/benchmark/RocCurvesView';
import { ConfusionMatrixCard } from './components/benchmark/ConfusionMatrixCard';
import { ExplainabilityView } from './components/explainability/ExplainabilityView';
import { DynamicPatientForm } from './components/prediction/DynamicPatientForm';
import { PredictionResultCard } from './components/prediction/PredictionResultCard';
import { ClassicalModelConfig, QuantumModelConfig } from './types';

export const App: React.FC = () => {
  const { activeTab, trainingStatus, benchmarkSummary } = useAppState();

  const [quantumConfig, setQuantumConfig] = useState<QuantumModelConfig>({
    n_qubits: 6,
    feature_map: 'ZZFeatureMap',
    ansatz: 'RealAmplitudes',
    ansatz_layers: 2,
    optimizer: 'COBYLA',
    max_iterations: 25,
    fast_demo_mode: true,
  });

  const [classicalConfig, setClassicalConfig] = useState<ClassicalModelConfig>({
    logistic_regression: true,
    random_forest: true,
    svm: true,
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header />
      <StatusBanner />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* TAB 1: DATASET & PROFILING */}
          {activeTab === 'dataset' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Dataset Profiling & Ingestion</h2>
                <p className="text-xs text-slate-400">
                  Select a clinical benchmark sample or upload an arbitrary tabular biomedical CSV dataset
                </p>
              </div>

              <DatasetUploadCard />
              <DatasetProfileCard />
              <DatasetConfigCard />
            </div>
          )}

          {/* TAB 2: PREPROCESSING FLOW */}
          {activeTab === 'preprocessing' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Preprocessing & Feature Transformation</h2>
                <p className="text-xs text-slate-400">
                  Leakage-free imputation, categorical encoding, feature selection, and PCA quantum compression
                </p>
              </div>

              <PreprocessingFlowView />
            </div>
          )}

          {/* TAB 3: QUANTUM & CLASSICAL MODEL SETUP */}
          {activeTab === 'training' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Quantum & Classical Model Architecture</h2>
                <p className="text-xs text-slate-400">
                  Configure Variational Quantum Classifier (VQC) parameterized circuits and classical baseline models
                </p>
              </div>

              <ModelConfigCard
                quantumConfig={quantumConfig}
                setQuantumConfig={setQuantumConfig}
                classicalConfig={classicalConfig}
                setClassicalConfig={setClassicalConfig}
                disabled={trainingStatus?.is_training}
              />

              <TrainingControlCard
                quantumConfig={quantumConfig}
                classicalConfig={classicalConfig}
              />
            </div>
          )}

          {/* TAB 4: BENCHMARK & COMPARISON */}
          {activeTab === 'benchmark' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Comparative Benchmark & Diagnostic Metrics</h2>
                <p className="text-xs text-slate-400">
                  Honest evaluation comparing Variational Quantum Classifier (VQC) against Logistic Regression, Random Forest, and SVM
                </p>
              </div>

              {benchmarkSummary ? (
                <>
                  <MetricsComparisonTable />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MetricsRadarChart />
                    <RocCurvesView />
                  </div>
                  <ConfusionMatrixCard />
                </>
              ) : (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                  <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No Benchmark Results Available</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Please configure models in the Quantum & ML Setup tab and run training to generate benchmark metrics.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXPLAINABILITY */}
          {activeTab === 'explainability' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Explainability & Feature Sensitivity</h2>
                <p className="text-xs text-slate-400">
                  Quantum Model Feature Sensitivity Analysis via finite difference perturbation and classical feature importances
                </p>
              </div>

              {benchmarkSummary ? (
                <ExplainabilityView />
              ) : (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                  <Eye className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Models Not Yet Evaluated</p>
                  <p className="text-xs text-slate-500">Train models to compute Quantum Feature Sensitivity analysis.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DYNAMIC PATIENT PREDICTION LAB */}
          {activeTab === 'prediction' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Dynamic Patient Inference Lab</h2>
                <p className="text-xs text-slate-400">
                  Real-time clinical inference through fitted preprocessing, PCA projection, and model prediction
                </p>
              </div>

              {benchmarkSummary ? (
                <>
                  <DynamicPatientForm />
                  <PredictionResultCard />
                </>
              ) : (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                  <Stethoscope className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Inference Engine Not Ready</p>
                  <p className="text-xs text-slate-500">Please train models before executing patient inference.</p>
                </div>
              )}
            </div>
          )}

          {/* Medical Research Disclaimer */}
          <div className="pt-6">
            <MedicalDisclaimer />
          </div>
        </main>
      </div>
    </div>
  );
};
