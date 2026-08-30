from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Health & Samples ---
class HealthResponse(BaseModel):
    status: str
    version: str
    fast_demo_mode: bool
    quantum_simulator: str


class SampleDatasetItem(BaseModel):
    id: str
    name: str
    description: str
    rows: int
    columns: int
    suggested_target: str
    suggested_positive_class: str


# --- Dataset Profiling ---
class ColumnProfile(BaseModel):
    name: str
    dtype: str
    inferred_type: str  # "numerical", "categorical", "identifier", "constant"
    missing_count: int
    missing_percentage: float
    unique_count: int
    sample_values: List[Any]
    is_candidate_target: bool = False
    is_candidate_identifier: bool = False
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    median_value: Optional[float] = None
    categories: Optional[List[str]] = None


class TargetClassDistribution(BaseModel):
    class_label: str
    count: int
    percentage: float


class DatasetProfileResponse(BaseModel):
    dataset_name: str
    total_rows: int
    total_columns: int
    numerical_count: int
    categorical_count: int
    missing_values_total: int
    duplicate_rows: int
    constant_columns: List[str]
    columns: List[ColumnProfile]
    suggested_target: Optional[str] = None
    suggested_positive_class: Optional[str] = None
    suggested_identifiers: List[str] = []
    target_distribution: Optional[List[TargetClassDistribution]] = None
    preview_rows: List[Dict[str, Any]] = []


# --- Dataset Configuration ---
class DatasetConfigRequest(BaseModel):
    target_column: str
    positive_class: str
    identifier_columns: List[str] = []
    excluded_features: List[str] = []
    problem_type: str = "binary_classification"


# --- Preprocessing ---
class FeaturePipelineStep(BaseModel):
    step_name: str
    description: str
    input_dimension: int
    output_dimension: int
    details: Dict[str, Any] = {}


class PreprocessingRequest(BaseModel):
    test_split_ratio: float = Field(0.2, ge=0.1, le=0.4)
    feature_selection_k: Optional[int] = Field(None, ge=2)
    n_quantum_features: int = Field(6, ge=4, le=10)
    scaler_type: str = "standard"  # "standard" | "minmax"


class PreprocessingSummary(BaseModel):
    raw_feature_count: int
    encoded_feature_count: int
    selected_feature_count: int
    quantum_feature_count: int
    train_samples: int
    test_samples: int
    positive_class: str
    negative_class: str
    target_column: str
    excluded_identifiers: List[str]
    pipeline_steps: List[FeaturePipelineStep]
    pca_explained_variance_ratio: List[float]
    pca_cumulative_variance: float
    selected_feature_names: List[str]


# --- Training & Models ---
class QuantumModelConfig(BaseModel):
    n_qubits: int = Field(6, ge=4, le=8)
    feature_map: str = "ZZFeatureMap"  # "ZZFeatureMap" | "AngleEncoding"
    ansatz: str = "RealAmplitudes"  # "RealAmplitudes" | "EfficientSU2"
    ansatz_layers: int = Field(2, ge=1, le=4)
    optimizer: str = "COBYLA"  # "COBYLA" | "SLSQP" | "SPSA"
    max_iterations: int = Field(25, ge=5, le=150)
    fast_demo_mode: bool = True


class ClassicalModelConfig(BaseModel):
    logistic_regression: bool = True
    random_forest: bool = True
    svm: bool = True


class TrainRequest(BaseModel):
    quantum_config: QuantumModelConfig = QuantumModelConfig()
    classical_config: ClassicalModelConfig = ClassicalModelConfig()


class StepStatus(BaseModel):
    name: str
    status: str  # "pending" | "running" | "completed" | "failed"
    progress: int = 0
    message: str = ""


class TrainingStatusResponse(BaseModel):
    is_training: bool
    current_step: str
    overall_progress: int
    steps: List[StepStatus]
    error_message: Optional[str] = None


# --- Evaluation & Results ---
class RocPoint(BaseModel):
    fpr: float
    tpr: float
    threshold: float


class ConfusionMatrixData(BaseModel):
    true_positive: int
    false_positive: int
    true_negative: int
    false_negative: int
    labels: List[str]  # [negative_label, positive_label]


class EvaluationMetrics(BaseModel):
    accuracy: float
    precision: float
    sensitivity: float  # recall / true positive rate
    specificity: float  # true negative rate
    f1_score: float
    roc_auc: float
    training_time_seconds: float
    inference_time_ms: float


class ModelEvaluationResult(BaseModel):
    model_id: str
    model_name: str
    model_type: str  # "classical" | "quantum"
    metrics: EvaluationMetrics
    confusion_matrix: ConfusionMatrixData
    roc_curve: List[RocPoint]
    parameters: Dict[str, Any] = {}


class BenchmarkSummary(BaseModel):
    dataset_name: str
    target_column: str
    positive_class: str
    test_samples_count: int
    results: Dict[str, ModelEvaluationResult]
    best_accuracy_model: str
    best_sensitivity_model: str
    best_auc_model: str


# --- Explainability ---
class ExplainabilityFeature(BaseModel):
    feature_name: str
    importance_score: float
    relative_percentage: float
    direction: Optional[str] = None  # "positive", "negative", "neutral"


class QuantumSensitivityResult(BaseModel):
    quantum_features: List[ExplainabilityFeature]
    projected_original_features: List[ExplainabilityFeature]
    perturbation_delta: float
    methodology: str


class ExplainabilityResult(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    features: List[ExplainabilityFeature]
    quantum_sensitivity: Optional[QuantumSensitivityResult] = None
    interpretation_note: str


# --- Prediction ---
class PatientPredictionRequest(BaseModel):
    features: Dict[str, Any]
    model_id: str = "vqc"  # "vqc" | "logistic_regression" | "random_forest" | "svm"


class PatientFeatureAttribution(BaseModel):
    feature_name: str
    input_value: Any
    attribution_score: float
    description: str


class PatientPredictionResponse(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    predicted_class: str
    predicted_label: str  # e.g., "Malignant" or "Disease Present"
    probability_positive: float
    probability_negative: float
    risk_level: str  # "Low Risk", "Moderate Risk", "High Risk"
    confidence: float
    quantum_features_state: Optional[List[float]] = None
    feature_attributions: List[PatientFeatureAttribution] = []
    patient_id: Optional[str] = None
