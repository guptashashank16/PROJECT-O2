import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';
import {
  BenchmarkSummary,
  DatasetConfigRequest,
  DatasetProfileResponse,
  ExperimentDetail,
  ExperimentSummary,
  ExplainabilityResult,
  PatientPredictionResponse,
  PreprocessingRequest,
  PreprocessingSummary,
  SampleDatasetItem,
  TrainingStatusResponse,
  TrainRequest,
} from '../types';

export type TabType =
  | 'dataset'
  | 'preprocessing'
  | 'training'
  | 'benchmark'
  | 'explainability'
  | 'prediction'
  | 'resources'
  | 'comparison'
  | 'hardware';

interface AppStateContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  samples: SampleDatasetItem[];
  profile: DatasetProfileResponse | null;
  config: DatasetConfigRequest | null;
  preprocessingSummary: PreprocessingSummary | null;
  trainingStatus: TrainingStatusResponse | null;
  benchmarkSummary: BenchmarkSummary | null;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  explainability: ExplainabilityResult | null;
  patientPrediction: PatientPredictionResponse | null;
  experiments: ExperimentSummary[];
  activeExperiment: ExperimentDetail | null;
  isLoading: boolean;
  isBackendOnline: boolean;
  error: string | null;
  clearError: () => void;

  // Actions
  fetchSamples: () => Promise<void>;
  loadSample: (sampleId: string) => Promise<void>;
  uploadDataset: (file: File) => Promise<void>;
  saveConfig: (config: DatasetConfigRequest) => Promise<void>;
  executePreprocessing: (params: PreprocessingRequest) => Promise<void>;
  triggerTraining: (request: TrainRequest) => Promise<void>;
  fetchBenchmarkResults: () => Promise<void>;
  fetchExplainability: (modelId: string) => Promise<void>;
  runPrediction: (features: Record<string, any>, modelId?: string) => Promise<void>;
  fetchExperiments: () => Promise<void>;
  switchExperiment: (expId: string) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dataset');
  const [samples, setSamples] = useState<SampleDatasetItem[]>([]);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [config, setConfig] = useState<DatasetConfigRequest | null>(null);
  const [preprocessingSummary, setPreprocessingSummary] = useState<PreprocessingSummary | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatusResponse | null>(null);
  const [benchmarkSummary, setBenchmarkSummary] = useState<BenchmarkSummary | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('vqc');
  const [explainability, setExplainability] = useState<ExplainabilityResult | null>(null);
  const [patientPrediction, setPatientPrediction] = useState<PatientPredictionResponse | null>(null);
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<ExperimentDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchExperiments = async () => {
    try {
      const list = await api.listExperiments();
      setExperiments(list);
      const active = await api.getActiveExperiment();
      setActiveExperiment(active);
    } catch (err: any) {
      console.warn('Could not fetch experiments:', err);
    }
  };

  const switchExperiment = async (expId: string) => {
    try {
      setIsLoading(true);
      clearError();
      const active = await api.setActiveExperiment(expId);
      setActiveExperiment(active);
      if (active.benchmark_summary) {
        setBenchmarkSummary(active.benchmark_summary);
      }
      await fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load: Check backend and fetch initial dataset & samples
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        await api.getHealth();
        setIsBackendOnline(true);
        const sampleList = await api.getSamples();
        setSamples(sampleList);

        // Fetch initial dataset profile
        const prof = await api.getProfile();
        setProfile(prof);
        if (prof) {
          setConfig({
            target_column: prof.suggested_target || 'diagnosis',
            positive_class: prof.suggested_positive_class || 'M',
            identifier_columns: prof.suggested_identifiers,
            excluded_features: [],
            problem_type: 'binary_classification',
          });
        }

        await fetchExperiments();
      } catch (err: any) {
        setIsBackendOnline(false);
        setError('Backend server offline. Please start the FastAPI backend service on port 8000.');
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const fetchSamples = async () => {
    try {
      const sampleList = await api.getSamples();
      setSamples(sampleList);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSample = async (sampleId: string) => {
    try {
      setIsLoading(true);
      clearError();
      const prof = await api.loadSample(sampleId);
      setProfile(prof);
      setConfig({
        target_column: prof.suggested_target || '',
        positive_class: prof.suggested_positive_class || '',
        identifier_columns: prof.suggested_identifiers,
        excluded_features: [],
        problem_type: 'binary_classification',
      });
      setPreprocessingSummary(null);
      setBenchmarkSummary(null);
      setExplainability(null);
      setPatientPrediction(null);
      await fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDataset = async (file: File) => {
    try {
      setIsLoading(true);
      clearError();
      const prof = await api.uploadDataset(file);
      setProfile(prof);
      setConfig({
        target_column: prof.suggested_target || '',
        positive_class: prof.suggested_positive_class || '',
        identifier_columns: prof.suggested_identifiers,
        excluded_features: [],
        problem_type: 'binary_classification',
      });
      setPreprocessingSummary(null);
      setBenchmarkSummary(null);
      setExplainability(null);
      setPatientPrediction(null);
      await fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: DatasetConfigRequest) => {
    try {
      setIsLoading(true);
      clearError();
      const saved = await api.configureDataset(newConfig);
      setConfig(saved);
      const updatedProfile = await api.getProfile(newConfig.target_column);
      setProfile(updatedProfile);
      await fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executePreprocessing = async (params: PreprocessingRequest) => {
    try {
      setIsLoading(true);
      clearError();
      const summary = await api.preprocess(params);
      setPreprocessingSummary(summary);
      setActiveTab('training');
      await fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerTraining = async (request: TrainRequest) => {
    try {
      clearError();
      setIsLoading(true);
      const initialStatus = await api.train(request);
      setTrainingStatus(initialStatus);

      // Poll status until completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getTrainingStatus();
          setTrainingStatus(status);
          if (!status.is_training) {
            clearInterval(pollInterval);
            setIsLoading(false);
            if (!status.error_message) {
              await fetchBenchmarkResults();
              await fetchExplainability(selectedModelId);
              await fetchExperiments();
              setActiveTab('benchmark');
            } else {
              setError(status.error_message);
            }
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsLoading(false);
          setError(pollErr.message);
        }
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message);
    }
  };

  const fetchBenchmarkResults = async () => {
    try {
      const results = await api.getBenchmarkSummary();
      setBenchmarkSummary(results);
    } catch (err: any) {
      // Fallback: try to get benchmark from the active experiment
      try {
        const active = await api.getActiveExperiment();
        if (active?.benchmark_summary) {
          setBenchmarkSummary(active.benchmark_summary);
        } else {
          setError(`Benchmark results unavailable: ${err.message}`);
        }
      } catch {
        setError(`Benchmark results unavailable: ${err.message}`);
      }
    }
  };


  const fetchExplainability = async (modelId: string) => {
    try {
      const expl = await api.getExplainability(modelId);
      setExplainability(expl);
    } catch (err: any) {
      console.warn(err.message);
    }
  };

  const runPrediction = async (features: Record<string, any>, modelId?: string) => {
    try {
      setIsLoading(true);
      clearError();
      const targetModel = modelId || selectedModelId;
      const res = await api.predictPatient({
        features,
        model_id: targetModel,
      });
      setPatientPrediction(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (benchmarkSummary && selectedModelId) {
      fetchExplainability(selectedModelId);
    }
  }, [selectedModelId, benchmarkSummary]);

  return (
    <AppStateContext.Provider
      value={{
        activeTab,
        setActiveTab,
        samples,
        profile,
        config,
        preprocessingSummary,
        trainingStatus,
        benchmarkSummary,
        selectedModelId,
        setSelectedModelId,
        explainability,
        patientPrediction,
        experiments,
        activeExperiment,
        isLoading,
        isBackendOnline,
        error,
        clearError,
        fetchSamples,
        loadSample,
        uploadDataset,
        saveConfig,
        executePreprocessing,
        triggerTraining,
        fetchBenchmarkResults,
        fetchExplainability,
        runPrediction,
        fetchExperiments,
        switchExperiment,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
