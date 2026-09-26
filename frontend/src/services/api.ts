import {
  BenchmarkSummary,
  DatasetConfigRequest,
  DatasetProfileResponse,
  DisagreementAnalysisResponse,
  ExperimentComparisonResponse,
  ExperimentDetail,
  ExperimentSummary,
  ExplainabilityResult,
  ModelEvaluationResult,
  PatientPredictionRequest,
  PatientPredictionResponse,
  PreprocessingRequest,
  PreprocessingSummary,
  QuantumModelMetadata,
  QuantumUtilityReport,
  ResourceProfile,
  SampleDatasetItem,
  TrainingStatusResponse,
  TrainRequest,
  WhatIfRequest,
  WhatIfResponse,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('qcare_jwt_token') ?? localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.detail || json.message || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to connect to backend server');
    return res.json();
  },

  // Dataset Operations
  async getSamples(): Promise<SampleDatasetItem[]> {
    const res = await fetch(`${API_BASE}/dataset/samples`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch sample datasets');
    return res.json();
  },

  async loadSample(sampleId: string): Promise<DatasetProfileResponse> {
    const res = await fetch(`${API_BASE}/dataset/load-sample?sample_id=${encodeURIComponent(sampleId)}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Failed to load sample dataset'));
    }
    return res.json();
  },

  async uploadDataset(file: File): Promise<DatasetProfileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/dataset/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
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
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch dataset profile');
    }
    return res.json();
  },

  async configureDataset(config: DatasetConfigRequest): Promise<DatasetConfigRequest> {
    const res = await fetch(`${API_BASE}/dataset/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training trigger failed');
    }
    return res.json();
  },

  async getTrainingStatus(): Promise<TrainingStatusResponse> {
    const res = await fetch(`${API_BASE}/training/status`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to get training status');
    return res.json();
  },

  // Results & Explainability
  async getBenchmarkSummary(): Promise<BenchmarkSummary> {
    const res = await fetch(`${API_BASE}/results`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Benchmark results not ready');
    }
    return res.json();
  },

  async getModelResult(modelId: string): Promise<ModelEvaluationResult> {
    const res = await fetch(`${API_BASE}/results/${encodeURIComponent(modelId)}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Model result not found');
    return res.json();
  },

  async getExplainability(modelId: string): Promise<ExplainabilityResult> {
    const res = await fetch(`${API_BASE}/explainability/${encodeURIComponent(modelId)}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Explainability data not found');
    return res.json();
  },

  // Patient Prediction
  async predictPatient(request: PatientPredictionRequest): Promise<PatientPredictionResponse> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Prediction failed'));
    }
    return res.json();
  },

  // What-If Sensitivity Analysis
  async analyzeWhatIf(request: WhatIfRequest): Promise<WhatIfResponse> {
    const res = await fetch(`${API_BASE}/whatif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'What-if analysis failed'));
    }
    return res.json();
  },

  // Model Disagreement Lab
  async getDisagreementAnalysis(): Promise<DisagreementAnalysisResponse> {
    const res = await fetch(`${API_BASE}/disagreement`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Disagreement analysis failed'));
    }
    return res.json();
  },

  // Quantum Utility Report & Metadata
  async getQuantumUtilityReport(): Promise<QuantumUtilityReport> {
    const res = await fetch(`${API_BASE}/report/utility`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Failed to fetch Quantum Utility Report'));
    }
    return res.json();
  },

  getReportCsvUrl(): string {
    return `${API_BASE}/report/utility/export/csv`;
  },

  // Experiment Registry Operations
  async listExperiments(): Promise<ExperimentSummary[]> {
    const res = await fetch(`${API_BASE}/experiments`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch experiments list');
    return res.json();
  },

  async getExperiment(experimentId: string): Promise<ExperimentDetail> {
    const res = await fetch(`${API_BASE}/experiments/${encodeURIComponent(experimentId)}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error(`Failed to fetch experiment ${experimentId}`);
    return res.json();
  },

  async getActiveExperiment(): Promise<ExperimentDetail> {
    const res = await fetch(`${API_BASE}/experiments/active`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch active experiment');
    return res.json();
  },

  async setActiveExperiment(experimentId: string): Promise<ExperimentDetail> {
    const res = await fetch(`${API_BASE}/experiments/active/${encodeURIComponent(experimentId)}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to set active experiment');
    return res.json();
  },

  async createExperiment(payload: { experiment_name?: string; dataset_name?: string; description?: string }): Promise<ExperimentDetail> {
    const res = await fetch(`${API_BASE}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create experiment');
    }
    return res.json();
  },

  async deleteExperiment(experimentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/experiments/${encodeURIComponent(experimentId)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to delete experiment');
  },

  async compareExperiments(experimentIds: string[]): Promise<ExperimentComparisonResponse> {
    const res = await fetch(`${API_BASE}/experiments/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ experiment_ids: experimentIds }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to compare experiments');
    }
    return res.json();
  },

  async getExperimentResourceProfile(experimentId: string): Promise<ResourceProfile> {
    const res = await fetch(`${API_BASE}/experiments/${encodeURIComponent(experimentId)}/resource-profile`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch resource profile');
    return res.json();
  },

  async getQuantumModels(): Promise<QuantumModelMetadata[]> {
    const res = await fetch(`${API_BASE}/quantum/models`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch quantum model registry');
    return res.json();
  },

  async getQuantumBackends(): Promise<QuantumBackendInfo[]> {
    const res = await fetch(`${API_BASE}/quantum/backends`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Failed to fetch quantum backends');
    return res.json();
  },

  async validateIBMToken(token: string, instance?: string): Promise<IBMTokenValidationResponse> {
    const res = await fetch(`${API_BASE}/quantum/validate-ibm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ token, instance }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to validate IBM Quantum token');
    }
    return res.json();
  },

  async exportCircuitQASM(params: {
    n_qubits: number;
    feature_map: string;
    ansatz: string;
    ansatz_layers: number;
    weights?: number[];
  }): Promise<QASMExportResponse> {
    const res = await fetch(`${API_BASE}/quantum/export-qasm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to export OpenQASM 3.0');
    }
    return res.json();
  },

  async exportExperimentQASM(experimentId: string): Promise<QASMExportResponse> {
    const res = await fetch(`${API_BASE}/quantum/experiments/${encodeURIComponent(experimentId)}/qasm`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to export experiment OpenQASM 3.0');
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
