import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Cpu,
  Database,
  Eye,
  Gauge,
  GitBranch,
  GitCompare,
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
import { QuantumModelRegistryCard } from './components/models/QuantumModelRegistryCard';
import { TrainingControlCard } from './components/models/TrainingControlCard';
import { MetricsComparisonTable } from './components/benchmark/MetricsComparisonTable';
import { MetricsRadarChart } from './components/benchmark/MetricsRadarChart';
import { RocCurvesView } from './components/benchmark/RocCurvesView';
import { ConfusionMatrixCard } from './components/benchmark/ConfusionMatrixCard';
import { ExplainabilityView } from './components/explainability/ExplainabilityView';
import { DynamicPatientForm } from './components/prediction/DynamicPatientForm';
import { PredictionResultCard } from './components/prediction/PredictionResultCard';
import { ExperimentRegistryCard } from './components/experiments/ExperimentRegistryCard';
import { ResourceProfileCard } from './components/experiments/ResourceProfileCard';
import { ExperimentComparisonView } from './components/experiments/ExperimentComparisonView';
import { QuantumHardwareConnectorCard } from './components/quantum/QuantumHardwareConnectorCard';
import { NotFoundPage } from './pages/NotFoundPage';
import { ClassicalModelConfig, QuantumModelConfig } from './types';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, trainingStatus, benchmarkSummary } = useAppState();
  const [show404, setShow404] = useState(false);

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

  // Dynamic SEO Meta & Title Manager
  useEffect(() => {
    const metaTitles: Record<string, { title: string; desc: string }> = {
      dataset: {
        title: 'Q-CARE — Dataset Analysis & Registry',
        desc: 'Biomedical tabular dataset profiling, quality audit, and experiment registry.',
      },
      preprocessing: {
        title: 'Q-CARE — Preprocessing & PCA',
        desc: 'Leakage-free clinical preprocessing, feature selection, and PCA quantum compression.',
      },
      training: {
        title: 'Q-CARE — Quantum & Classical Model Setup',
        desc: 'Variational Quantum Classifier (VQC) parameterized circuits, model catalog, and classical baselines.',
      },
      benchmark: {
        title: 'Q-CARE — Model Benchmark & Evidence Engine',
        desc: 'Stratified 5-fold cross-validation benchmark and 5-dimensional Quantum Evidence Engine verdict.',
      },
      explainability: {
        title: 'Q-CARE — Model Explainability',
        desc: 'Quantum Model Feature Sensitivity analysis and classical feature importances.',
      },
      prediction: {
        title: 'Q-CARE — Patient Inference & What-If Lab',
        desc: 'Real-time clinical inference and what-if sensitivity perturbation lab.',
      },
      resources: {
        title: 'Q-CARE — Resource & Scalability Profile',
        desc: 'Empirical quantum circuit dimensions, simulation latencies, and scalability profile.',
      },
      comparison: {
        title: 'Q-CARE — Multi-Experiment Comparison',
        desc: 'Empirical side-by-side benchmarking comparison across isolated parameter runs.',
      },
      hardware: {
        title: 'Q-CARE — Hardware & Cloud Runtime (OpenQASM 3.0)',
        desc: 'IBM Quantum cloud backend connection, QPU discovery, and OpenQASM 3.0 circuit export.',
      },
    };

    const currentMeta = metaTitles[activeTab] || {
      title: 'Q-CARE — Hybrid Quantum-Classical Platform',
      desc: 'Benchmarking Variational Quantum Classifiers against classical baselines on biomedical data.',
    };

    document.title = currentMeta.title;

    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', currentMeta.desc);
  }, [activeTab]);

  if (show404) {
    return (
      <NotFoundPage
        onReturn={() => {
          setShow404(false);
          setActiveTab('dataset');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/40 to-slate-50 flex flex-col font-sans text-slate-800">
      <Header />
      <StatusBanner />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* TAB 1: DATASET & PROFILING + EXPERIMENT REGISTRY */}
          {activeTab === 'dataset' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Profiling & Ingestion</h2>
                <p className="text-xs text-slate-500">
                  Select a clinical benchmark sample or upload an arbitrary tabular biomedical CSV dataset
                </p>
              </div>

              <ExperimentRegistryCard />
              <DatasetUploadCard />
              <DatasetProfileCard />
              <DatasetConfigCard />
            </div>
          )}

          {/* TAB 2: PREPROCESSING FLOW */}
          {activeTab === 'preprocessing' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Preprocessing & Feature Transformation</h2>
                <p className="text-xs text-slate-500">
                  Leakage-free imputation, categorical encoding, feature selection, and PCA quantum compression
                </p>
              </div>

              <PreprocessingFlowView />
            </div>
          )}

          {/* TAB 3: QUANTUM & CLASSICAL MODEL SETUP + CATALOG */}
          {activeTab === 'training' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quantum & Classical Model Architecture</h2>
                <p className="text-xs text-slate-500">
                  Configure Variational Quantum Classifier (VQC) parameterized circuits and classical baseline models
                </p>
              </div>

              <QuantumModelRegistryCard />

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

          {/* TAB 4: BENCHMARK & COMPARISON + EVIDENCE */}
          {activeTab === 'benchmark' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Comparative Benchmark & Evidence Engine</h2>
                <p className="text-xs text-slate-500">
                  Stratified 5-fold cross-validation benchmarking Variational Quantum Classifier (VQC) against classical baselines
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
                <div className="glass-panel-pink rounded-3xl p-12 text-center space-y-3 border border-pink-200">
                  <BarChart3 className="w-8 h-8 text-pink-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No Benchmark Results Available</p>
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
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Explainability & Feature Sensitivity</h2>
                <p className="text-xs text-slate-500">
                  Quantum Model Feature Sensitivity Analysis via finite difference perturbation and classical feature importances
                </p>
              </div>

              {benchmarkSummary ? (
                <ExplainabilityView />
              ) : (
                <div className="glass-panel-pink rounded-3xl p-12 text-center space-y-3 border border-pink-200">
                  <Eye className="w-8 h-8 text-pink-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Models Not Yet Evaluated</p>
                  <p className="text-xs text-slate-500">Train models to compute Quantum Feature Sensitivity analysis.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DYNAMIC PATIENT PREDICTION LAB & WHAT-IF */}
          {activeTab === 'prediction' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dynamic Patient Inference & What-If Lab</h2>
                <p className="text-xs text-slate-500">
                  Real-time clinical inference through fitted preprocessing, PCA projection, and model prediction
                </p>
              </div>

              {benchmarkSummary ? (
                <>
                  <DynamicPatientForm />
                  <PredictionResultCard />
                </>
              ) : (
                <div className="glass-panel-pink rounded-3xl p-12 text-center space-y-3 border border-pink-200">
                  <Stethoscope className="w-8 h-8 text-pink-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Inference Engine Not Ready</p>
                  <p className="text-xs text-slate-500">Please train models before executing patient inference.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMPUTATIONAL RESOURCE & SCALABILITY PROFILE */}
          {activeTab === 'resources' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Computational Resource & Scalability Profile</h2>
                <p className="text-xs text-slate-500">
                  Circuit depth, parameter counts, optimization iteration budgets, and empirical runtime measurements
                </p>
              </div>

              <ResourceProfileCard />
            </div>
          )}

          {/* TAB 8: MULTI-EXPERIMENT COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Experiment Benchmarking Comparison</h2>
                <p className="text-xs text-slate-500">
                  Neutral empirical comparison across isolated parameter variations and quantum circuit architectures
                </p>
              </div>

              <ExperimentComparisonView />
            </div>
          )}

          {/* TAB 9: QUANTUM HARDWARE & CLOUD RUNTIME (OPENQASM 3.0) */}
          {activeTab === 'hardware' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <QuantumHardwareConnectorCard
                quantumConfig={{
                  n_qubits: quantumConfig.n_qubits,
                  feature_map: quantumConfig.feature_map,
                  ansatz: quantumConfig.ansatz,
                  ansatz_layers: quantumConfig.ansatz_layers,
                }}
              />
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
