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
  training_time_seconds: number;
  inference_time_ms: number;
}

export interface ModelEvaluationResult {
  model_id: string;
  model_name: string;
  model_type: 'classical' | 'quantum';
  metrics: EvaluationMetrics;
  confusion_matrix: ConfusionMatrixData;
  roc_curve: RocPoint[];
  parameters: Record<string, any>;
}

export interface BenchmarkSummary {
  dataset_name: string;
  target_column: string;
  positive_class: string;
  test_samples_count: number;
  results: Record<string, ModelEvaluationResult>;
  best_accuracy_model: string;
  best_sensitivity_model: string;
  best_auc_model: string;
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
}

export interface ExplainabilityResult {
  model_id: string;
  model_name: string;
  model_type: string;
  features: ExplainabilityFeature[];
  quantum_sensitivity?: QuantumSensitivityResult;
  interpretation_note: string;
}

export interface PatientPredictionRequest {
  features: Record<string, any>;
  model_id: string;
}

export interface PatientFeatureAttribution {
  feature_name: string;
  input_value: any;
  attribution_score: number;
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
  feature_attributions: PatientFeatureAttribution[];
  patient_id?: string;
}
