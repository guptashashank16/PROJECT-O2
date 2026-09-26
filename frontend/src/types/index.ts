export interface SampleDatasetItem {
  id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
  suggested_target: string;
  suggested_positive_class: string;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  inferred_type: 'numerical' | 'categorical' | 'identifier' | 'constant';
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  sample_values: any[];
  is_candidate_target: boolean;
  is_candidate_identifier: boolean;
  min_value?: number;
  max_value?: number;
  mean_value?: number;
  median_value?: number;
  categories?: string[];
}

export interface TargetClassDistribution {
  class_label: string;
  count: number;
  percentage: number;
}

export interface DatasetProfileResponse {
  dataset_name: string;
  total_rows: number;
  total_columns: number;
  numerical_count: number;
  categorical_count: number;
  missing_values_total: number;
  duplicate_rows: number;
  constant_columns: string[];
  columns: ColumnProfile[];
  suggested_target?: string;
  suggested_positive_class?: string;
  suggested_identifiers: string[];
  target_distribution?: TargetClassDistribution[];
  preview_rows: Record<string, any>[];
}

export interface DatasetConfigRequest {
  target_column: string;
  positive_class: string;
  identifier_columns: string[];
  excluded_features: string[];
  problem_type: string;
}

export interface FeaturePipelineStep {
  step_name: string;
  description: string;
  input_dimension: number;
  output_dimension: number;
  details: Record<string, any>;
}

export interface PreprocessingRequest {
  test_split_ratio: number;
  feature_selection_k?: number;
  n_quantum_features: number;
  scaler_type: 'standard' | 'minmax';
}

export interface PreprocessingSummary {
  raw_feature_count: number;
  encoded_feature_count: number;
  selected_feature_count: number;
  quantum_feature_count: number;
  train_samples: number;
  test_samples: number;
  positive_class: string;
  negative_class: string;
  target_column: string;
  excluded_identifiers: string[];
  pipeline_steps: FeaturePipelineStep[];
  pca_explained_variance_ratio: number[];
  pca_cumulative_variance: number;
  selected_feature_names: string[];
}

export interface QuantumModelConfig {
  n_qubits: number;
  feature_map: string;
  ansatz: string;
  ansatz_layers: number;
  optimizer: string;
  max_iterations: number;
  fast_demo_mode: boolean;
}

export interface ClassicalModelConfig {
  logistic_regression: boolean;
  random_forest: boolean;
  svm: boolean;
}

export interface TrainRequest {
  quantum_config: QuantumModelConfig;
  classical_config: ClassicalModelConfig;
}

export interface StepStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
}

export interface TrainingStatusResponse {
  is_training: boolean;
  current_step: string;
  overall_progress: number;
  steps: StepStatus[];
  error_message?: string;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface ConfusionMatrixData {
  true_positive: number;
  false_positive: number;
  true_negative: number;
  false_negative: number;
  labels: string[];
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  sensitivity: number;
  specificity: number;
  f1_score: number;
  roc_auc: number;
  pr_auc?: number;
  brier_score?: number;
  training_time_seconds: number;
  inference_time_ms: number;
}

export interface FoldMetrics {
  fold_index: number;
  train_samples: number;
  val_samples: number;
  metrics: EvaluationMetrics;
}

export interface NoiseExecutionInfo {
  execution_mode: 'AER_EXECUTION' | 'MATHEMATICAL_FALLBACK';
  is_real_aer: boolean;
  is_mathematical_fallback: boolean;
  circuit_evaluated: boolean;
  shots: number;
  noise_model_applied: boolean;
  depolarizing_error_1q: number;
  depolarizing_error_2q: number;
  readout_error: number;
  methodology_disclaimer: string;
}

export interface ModelEvaluationResult {
  model_id: string;
  model_name: string;
  model_type: 'classical' | 'quantum';
  metrics: EvaluationMetrics;
  mean_metrics?: EvaluationMetrics;
  std_metrics?: Record<string, number>;
  fold_metrics?: FoldMetrics[];
  /** @deprecated use fold_metrics */
  folds?: FoldMetrics[];
  confusion_matrix: ConfusionMatrixData;
  roc_curve: RocPoint[];
  parameters: Record<string, any>;
  noise_info?: NoiseExecutionInfo;
}

export interface DimensionEvidence {
  dimension: string;
  status: 'passed' | 'warning' | 'neutral';
  quantum_metric: number;
  classical_metric: number;
  delta: number;
  quantum_std?: number;
  classical_std?: number;
  description: string;
  fold_values?: number[];
}

/** Matches backend QuantumEvidenceSummary Pydantic model */
export interface EvidenceResult {
  verdict: 'QUANTUM_PREFERRED' | 'QUANTUM_COMPETITIVE' | 'CLASSICAL_PREFERRED' | 'INSUFFICIENT_EVIDENCE';
  verdict_label: string;
  verdict_explanation: string;
  performance_evidence: DimensionEvidence;
  generalization_evidence: DimensionEvidence;
  calibration_evidence: DimensionEvidence;
  robustness_evidence: DimensionEvidence;
  resource_evidence: DimensionEvidence;
  rule_breakdown: string[];
  methodological_note?: string;
}

/** @deprecated alias kept for backward compat */
export type QuantumEvidenceSummary = EvidenceResult;

export interface ExperimentMetadata {
  platform_version: string;
  timestamp_utc: string;
  dataset_name: string;
  evaluation_framework: string;
  cv_splits: number;
  test_split_ratio: number;
  n_samples_total: number;
  n_samples_train: number;
  n_samples_test: number;
  n_quantum_features: number;
  pca_cumulative_variance: number;
  quantum_shots: number;
  quantum_optimizer: string;
  quantum_max_iterations: number;
  quantum_execution_mode: string;
  aer_noise_model: Record<string, any>;
  disclaimer: string;
}

export interface BenchmarkSummary {
  dataset_name: string;
  target_column: string;
  positive_class: string;
  test_samples_count: number;
  evaluation_mode: string;
  training_mode?: string;
  random_seed?: number;
  results: Record<string, ModelEvaluationResult>;
  noisy_vqc_result?: ModelEvaluationResult;
  noise_execution_info?: Record<string, any>;
  best_accuracy_model: string;
  best_sensitivity_model: string;
  best_auc_model: string;
  evidence?: EvidenceResult;
  experiment_id?: string;
  experiment_metadata?: ExperimentMetadata;
}


export interface ExplainabilityFeature {
  feature_name: string;
  importance_score: number;
  relative_percentage: number;
  direction?: 'positive' | 'negative' | 'neutral';
}

export interface QuantumSensitivityResult {
  quantum_features: ExplainabilityFeature[];
  projected_original_features: ExplainabilityFeature[];
  perturbation_delta: number;
  methodology: string;
  is_shap: boolean;
  method_note: string;
}

export interface ExplainabilityResult {
  model_id: string;
  model_name: string;
  model_type: string;
  method_name: string;
  method_description: string;
  features: ExplainabilityFeature[];
  quantum_sensitivity?: QuantumSensitivityResult;
  interpretation_note: string;
  limitations: string;
}

export interface PatientPredictionRequest {
  features: Record<string, any>;
  model_id: string;
}

export interface PatientFeatureValue {
  feature_name: string;
  raw_input_value: any;
  raw_value?: any;
  transformed_value: number;
  description: string;
}

export interface PatientPredictionResponse {
  model_id: string;
  model_name: string;
  model_type: string;
  predicted_class: string;
  predicted_label: string;
  probability_positive: number;
  probability_negative: number;
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  confidence: number;
  quantum_features_state?: number[];
  feature_values: PatientFeatureValue[];
  feature_attributions?: any[];
  patient_id?: string;
  interpretation_disclaimer?: string;
}

export interface WhatIfPerturbation {
  feature_name: string;
  new_value: any;
}

export interface WhatIfRequest {
  base_features: Record<string, any>;
  feature_changes?: Array<{
    feature_name: string;
    delta_type: 'absolute' | 'percentage' | 'set_value';
    delta_value: number;
  }>;
  perturbations?: WhatIfPerturbation[];
  model_ids?: string[];
}

export interface WhatIfModelResult {
  model_id: string;
  model_name: string;
  baseline_probability: number;
  modified_probability: number;
  delta: number;
  direction: string;
}

export interface WhatIfSingleResult {
  feature_changed: string;
  delta_type: string;
  delta_value: number;
  model_results: WhatIfModelResult[];
}

export interface WhatIfResponse {
  baseline_features: Record<string, any>;
  modified_features: Record<string, any>;
  results?: WhatIfSingleResult[];
  models?: Record<
    string,
    {
      model_id: string;
      model_name: string;
      base_probability_positive: number;
      perturbed_probability_positive: number;
      delta_probability: number;
      label_changed: boolean;
    }
  >;
  disclaimer?: string;
}

export interface DisagreementSample {
  sample_index: number;
  true_label?: number | null;
  model_probabilities: Record<string, number>;
  model_predictions: Record<string, number>;
  max_disagreement: number;
  is_quantum_classical_disagreement: boolean;
  /** @alias is_quantum_classical_disagreement */
  quantum_classical_divergent?: boolean;
}

export interface DisagreementAnalysisResponse {
  total_samples: number;
  disagreement_threshold: number;
  disagreeing_samples: DisagreementSample[];
  /** @alias disagreeing_samples */
  samples?: DisagreementSample[];
  disagreement_count: number;
  disagreement_rate: number;
  summary_stats: Record<string, any>;
}

/** @alias DisagreementAnalysisResponse */
export type DisagreementAnalysis = DisagreementAnalysisResponse;


export interface QuantumUtilityReport {
  experiment_id: string;
  generated_at: string;
  dataset_name: string;
  sample_count: number;
  feature_count: number;
  quantum_dimensions: number;
  n_qubits: number;
  feature_map: string;
  ansatz: string;
  ansatz_layers: number;
  optimizer: string;
  training_mode: string;
  vqc_training_samples: number;
  vqc_iterations: number;
  cv_metrics: Record<string, any>;
  held_out_metrics: Record<string, any>;
  classical_baselines: Record<string, any>;
  noise_robustness: Record<string, any>;
  resource_usage: Record<string, any>;
  fold_variability: Record<string, any>;
  disagreement_summary?: any;
  explainability_summary: Record<string, any>;
  evidence_verdict: string;
  evidence_explanation: string;
  benchmark_verdict?: string;
  verdict_explanation?: string;
  quantum_strengths?: string[];
  quantum_limitations?: string[];
  methodological_disclaimers?: string[];
  conclusion: string;
}

// ----------------------------------------------------------------------------
// Experiment Registry, Resource Profile & Model Catalog Types
// ----------------------------------------------------------------------------

export type JobStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'RUNNING'
  | 'PREPROCESSING'
  | 'CLASSICAL_TRAINING'
  | 'QUANTUM_TRAINING'
  | 'CROSS_VALIDATION'
  | 'NOISE_EVALUATION'
  | 'EXPLAINABILITY'
  | 'REPORT_GENERATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface QuantumResourceMetrics {
  qubit_count: number;
  circuit_depth: number;
  parameter_count: number;
  optimization_iterations: number;
  circuit_evaluations: number;
  simulation_time_seconds: number;
  inference_latency_ms: number;
  simulator_backend: string;
}

export interface ClassicalResourceMetrics {
  model_id: string;
  model_name: string;
  parameter_count_summary: string;
  training_time_seconds: number;
  inference_latency_ms: number;
}

export interface DatasetResourceMetrics {
  raw_rows: number;
  raw_columns: number;
  encoded_dimensions: number;
  selected_dimensions: number;
  pca_dimensions: number;
  dimension_compression_ratio: number;
}

export interface ResourceProfile {
  experiment_id: string;
  experiment_name: string;
  timestamp_utc: string;
  quantum_resources: QuantumResourceMetrics;
  classical_resources: ClassicalResourceMetrics[];
  dataset_resources: DatasetResourceMetrics;
  measured_vs_configured_notes: string;
  scalability_disclaimer: string;
}

export interface ExperimentSummary {
  experiment_id: string;
  experiment_name: string;
  created_at_utc: string;
  dataset_name: string;
  dataset_rows: number;
  feature_count: number;
  n_qubits: number;
  status: JobStatus;
  progress_percent: number;
  current_stage: string;
  best_model_name?: string;
  best_auc?: number;
  verdict?: string;
}

export interface ExperimentDetail {
  experiment_id: string;
  experiment_name: string;
  created_at_utc: string;
  updated_at_utc: string;
  user_id?: string;
  description?: string;
  dataset_name: string;
  dataset_fingerprint: string;
  dataset_rows: number;
  dataset_columns: number;
  target_column: string;
  positive_class: string;
  dataset_config?: DatasetConfigRequest;
  preprocessing_config?: PreprocessingRequest;
  preprocessing_summary?: PreprocessingSummary;
  quantum_config?: QuantumModelConfig;
  classical_config?: ClassicalModelConfig;
  status: JobStatus;
  progress_percent: number;
  current_stage: string;
  steps: StepStatus[];
  job_start_time?: string;
  job_end_time?: string;
  error_message?: string;
  benchmark_summary?: BenchmarkSummary;
  noisy_vqc_result?: ModelEvaluationResult;
  evidence?: EvidenceResult;
  explainability: Record<string, ExplainabilityResult>;
  disagreement?: DisagreementAnalysisResponse;
  utility_report?: QuantumUtilityReport;
  resource_profile?: ResourceProfile;
  metadata?: ExperimentMetadata;
}

export interface ExperimentComparisonItem {
  experiment_id: string;
  experiment_name: string;
  created_at_utc: string;
  dataset_name: string;
  n_qubits: number;
  ansatz: string;
  feature_map: string;
  ansatz_layers: number;
  vqc_auc_mean?: number;
  vqc_auc_std?: number;
  vqc_sensitivity?: number;
  vqc_specificity?: number;
  vqc_f1?: number;
  vqc_brier?: number;
  vqc_runtime_seconds?: number;
  vqc_parameter_count?: number;
  best_classical_model?: string;
  best_classical_auc?: number;
  best_classical_f1?: number;
  noisy_auc_retention_percent?: number;
  verdict?: string;
}

export interface ExperimentComparisonResponse {
  experiments: ExperimentComparisonItem[];
  comparison_timestamp_utc: string;
  neutral_empirical_notes: string;
}

export interface QuantumModelMetadata {
  model_id: string;
  name: string;
  description: string;
  circuit_family: string;
  implemented: boolean;
  status: string;
  ansatz_options: string[];
  feature_map_options: string[];
  supported_optimizers: string[];
  theoretical_notes: string;
}

export interface QuantumBackendInfo {
  backend_id: string;
  name: string;
  backend_type: string;
  qubit_count: number;
  status: string;
  is_cloud: boolean;
  is_hardware: boolean;
  avg_queue_seconds?: number;
  description: string;
  cloud_provider: string;
}

export interface IBMTokenValidationResponse {
  valid: boolean;
  message: string;
  available_devices: QuantumBackendInfo[];
  account_type?: string;
}

export interface QASMExportResponse {
  qasm_version: string;
  n_qubits: number;
  circuit_depth: number;
  gate_count: number;
  qasm_code: string;
  transpiled_for: string;
}
