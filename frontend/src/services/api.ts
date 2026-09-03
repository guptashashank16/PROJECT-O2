import {
  BenchmarkSummary,
  DatasetConfigRequest,
  DatasetProfileResponse,
  ExplainabilityResult,
  ModelEvaluationResult,
  PatientPredictionRequest,
  PatientPredictionResponse,
  PreprocessingRequest,
  PreprocessingSummary,
  SampleDatasetItem,
  TrainingStatusResponse,
  TrainRequest,
} from '../types';

const API_BASE = '/api';

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to connect to backend server');
    return res.json();
  },

  // Dataset Operations
  async getSamples(): Promise<SampleDatasetItem[]> {
    const res = await fetch(`${API_BASE}/dataset/samples`);
    if (!res.ok) throw new Error('Failed to fetch sample datasets');
    return res.json();
  },

  async loadSample(sampleId: string): Promise<DatasetProfileResponse> {
    const res = await fetch(`${API_BASE}/dataset/load-sample?sample_id=${encodeURIComponent(sampleId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to load sample dataset');
    }
    return res.json();
  },

  async uploadDataset(file: File): Promise<DatasetProfileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/dataset/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload dataset');
    }
    return res.json();
  },

  async getProfile(targetCol?: string): Promise<DatasetProfileResponse> {
    const url = targetCol
      ? `${API_BASE}/dataset/profile?target_column=${encodeURIComponent(targetCol)}`
      : `${API_BASE}/dataset/profile`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch dataset profile');
    }
    return res.json();
  },

  async configureDataset(config: DatasetConfigRequest): Promise<DatasetConfigRequest> {
    const res = await fetch(`${API_BASE}/dataset/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save dataset configuration');
    }
    return res.json();
  },

  // Preprocessing
  async preprocess(params: PreprocessingRequest): Promise<PreprocessingSummary> {
    const res = await fetch(`${API_BASE}/preprocess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Preprocessing failed');
    }
    return res.json();
  },

  // Training & Benchmarking
  async train(request: TrainRequest): Promise<TrainingStatusResponse> {
    const res = await fetch(`${API_BASE}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training trigger failed');
    }
    return res.json();
  },

  async getTrainingStatus(): Promise<TrainingStatusResponse> {
    const res = await fetch(`${API_BASE}/training/status`);
    if (!res.ok) throw new Error('Failed to get training status');
    return res.json();
  },

  // Results & Explainability
  async getBenchmarkSummary(): Promise<BenchmarkSummary> {
    const res = await fetch(`${API_BASE}/results`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Benchmark results not ready');
    }
    return res.json();
  },

  async getModelResult(modelId: string): Promise<ModelEvaluationResult> {
    const res = await fetch(`${API_BASE}/results/${encodeURIComponent(modelId)}`);
    if (!res.ok) throw new Error('Model result not found');
    return res.json();
  },

  async getExplainability(modelId: string): Promise<ExplainabilityResult> {
    const res = await fetch(`${API_BASE}/explainability/${encodeURIComponent(modelId)}`);
    if (!res.ok) throw new Error('Explainability data not found');
    return res.json();
  },

  // Patient Prediction
  async predictPatient(request: PatientPredictionRequest): Promise<PatientPredictionResponse> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  // Auth Operations
  async login(username_or_email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid username or password');
    }
    return res.json();
  },

  async register(username: string, email: string, password: string, full_name?: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, full_name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },
};

export const apiService = api;

