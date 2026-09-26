"""
Q-CARE Pydantic schemas — Hybrid Quantum-Classical Clinical AI Platform
=======================================================================
Research / benchmarking platform for SIH26139.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.evidence.evidence_engine import QuantumEvidenceSummary


# ---------------------------------------------------------------------------
# Health & Samples
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    fast_demo_mode: bool
    quantum_simulator: str


class User(BaseModel):
    username: str
    email: str
    role: str
    full_name: str
    permissions: List[str] = []


class SampleDatasetItem(BaseModel):
    id: str
    name: str
    description: str
    rows: int
    columns: int
    suggested_target: str
    suggested_positive_class: str


# ---------------------------------------------------------------------------
# Dataset Profiling
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Dataset Configuration
# ---------------------------------------------------------------------------

class DatasetConfigRequest(BaseModel):
    target_column: str
    positive_class: str
    identifier_columns: List[str] = []
    excluded_features: List[str] = []
    problem_type: str = "binary_classification"


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Training & Model Configuration
# ---------------------------------------------------------------------------

class QuantumModelConfig(BaseModel):
    n_qubits: int = Field(6, ge=4, le=8)
    feature_map: str = "ZZFeatureMap"  # "ZZFeatureMap" | "AngleEncoding"
    ansatz: str = "RealAmplitudes"     # "RealAmplitudes" | "EfficientSU2"
    ansatz_layers: int = Field(2, ge=1, le=4)
    optimizer: str = "COBYLA"          # "COBYLA" | "SLSQP" | "SPSA"
    max_iterations: int = Field(25, ge=5, le=150)
    fast_demo_mode: bool = True        # True → Demo Mode, False → Research Mode


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


# ---------------------------------------------------------------------------
# Evaluation & Results
# ---------------------------------------------------------------------------

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


class PrPoint(BaseModel):
    precision: float
    recall: float
    threshold: float


class CalibrationPoint(BaseModel):
    mean_predicted_value: float
    fraction_of_positives: float


class EvaluationMetrics(BaseModel):
    accuracy: float
    precision: float
    sensitivity: float   # recall / true positive rate
    specificity: float   # true negative rate
    f1_score: float
    roc_auc: float
    pr_auc: float = 0.0
    brier_score: float = 0.0
    training_time_seconds: float
    inference_time_ms: float


# Per-fold metrics for cross-validation detail
class FoldMetrics(BaseModel):
    fold_index: int
    train_samples: int = 0
    val_samples: int = 0
    metrics: EvaluationMetrics


class ModelEvaluationResult(BaseModel):
    model_id: str
    model_name: str
    model_type: str  # "classical" | "quantum"
    # Held-out test set evaluation (primary held-out split)
    metrics: EvaluationMetrics
    # Cross-validation summary statistics
    mean_metrics: Optional[EvaluationMetrics] = None
    std_metrics: Optional[EvaluationMetrics] = None
    # Per-fold detail for transparency
    fold_metrics: Optional[List[FoldMetrics]] = None
    confusion_matrix: ConfusionMatrixData
    roc_curve: List[RocPoint] = []
    pr_curve: List[PrPoint] = []
    calibration_curve: List[CalibrationPoint] = []
    parameters: Dict[str, Any] = {}


# Noise execution metadata returned alongside noisy VQC result
class NoiseExecutionInfo(BaseModel):
    execution_mode: str           # "AER_EXECUTION" | "FALLBACK_SIMULATION"
    aer_available: bool
    one_qubit_gate_error: float
    two_qubit_gate_error: float
    readout_error: float
    n_shots: Optional[int] = None
    fallback_reason: Optional[str] = None
    error: Optional[str] = None


class BenchmarkSummary(BaseModel):
    dataset_name: str
    target_column: str
    positive_class: str
    test_samples_count: int
    # Execution / methodology metadata
    evaluation_mode: str = "5-fold_stratified_cross_validation"
    training_mode: str = "DEMO_MODE"  # "DEMO_MODE" | "RESEARCH_MODE"
    random_seed: int = 42
    results: Dict[str, ModelEvaluationResult]
    noisy_vqc_result: Optional[ModelEvaluationResult] = None
    noise_execution_info: Optional[NoiseExecutionInfo] = None
    evidence: Optional[QuantumEvidenceSummary] = None
    best_accuracy_model: str
    best_sensitivity_model: str
    best_auc_model: str
    # Experiment metadata
    experiment_id: Optional[str] = None
    experiment_metadata: Optional["ExperimentMetadata"] = None


class EvidenceResult(BaseModel):
    """Minimal evidence object used by experiment tracking and report generation."""
    verdict: str = "INSUFFICIENT_EVIDENCE"
    summary: str = ""
    score: float = 0.0
    evidence_points: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}
    notes: List[str] = []


class DisagreementAnalysis(BaseModel):
    """Lightweight disagreement summary for model comparisons."""
    total_samples: int = 0
    disagreement_threshold: float = 0.1
    disagreement_count: int = 0
    disagreement_rate: float = 0.0
    verdict: str = "INSUFFICIENT_EVIDENCE"
    summary: Dict[str, Any] = {}
    samples: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Experiment Metadata (Task Group 5)
# ---------------------------------------------------------------------------

class ExperimentMetadata(BaseModel):
    """Full scientific experiment record for reproducibility and audit."""
    experiment_id: str
    timestamp: str
    dataset_name: str
    dataset_rows: int
    dataset_columns: int
    target_column: str
    positive_class: str
    train_samples: int
    test_samples: int
    test_split_ratio: float
    random_seed: int
    # Preprocessing config
    scaler_type: str
    feature_selection_k: Optional[int]
    pca_components: int
    selected_feature_names: List[str]
    # Quantum config
    n_qubits: int
    feature_map: str
    ansatz: str
    ansatz_layers: int
    optimizer: str
    max_iterations: int
    training_mode: str  # "DEMO_MODE" | "RESEARCH_MODE"
    vqc_training_samples_used: int  # actual samples used in VQC optimisation
    vqc_iterations_used: int
    # Classical models
    classical_models_enabled: List[str]
    # Noise config
    noise_one_qubit_error: float
    noise_two_qubit_error: float
    noise_readout_error: float
    noise_execution_mode: str
    # Results summary (populated after training)
    benchmark_metrics: Optional[Dict[str, Any]] = None
    evidence_verdict: Optional[str] = None


# ---------------------------------------------------------------------------
# Explainability
# ---------------------------------------------------------------------------

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
    method_name: str        # Human-readable method label
    method_description: str # Explains exactly what was computed
    features: List[ExplainabilityFeature]
    quantum_sensitivity: Optional[QuantumSensitivityResult] = None
    interpretation_note: str


# ---------------------------------------------------------------------------
# Prediction (Task Group 7 — honest feature-value display)
# ---------------------------------------------------------------------------

class PatientPredictionRequest(BaseModel):
    features: Dict[str, Any]
    model_id: str = "vqc"  # "vqc" | "logistic_regression" | "random_forest" | "svm"


class PatientFeatureValue(BaseModel):
    """
    Represents a transformed/normalized model input feature value.
    NOT an attribution or causal score.
    """
    feature_name: str
    raw_input_value: Any
    raw_value: Optional[Any] = None
    transformed_value: float = 0.0
    description: str = ""


class PatientPredictionResponse(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    predicted_class: str
    predicted_label: str
    probability_positive: float
    probability_negative: float
    risk_level: str  # "Low Risk", "Moderate Risk", "High Risk"
    confidence: float
    quantum_features_state: Optional[List[float]] = None
    feature_values: List[PatientFeatureValue] = []
    patient_id: Optional[str] = None
    feature_attributions: List[Any] = []  # Deprecated; use feature_values
    interpretation_disclaimer: Optional[str] = (
        "Feature values represent normalized model inputs and PCA projections. "
        "They do not constitute causal patient risk factor rankings."
    )


# ---------------------------------------------------------------------------
# What-If Analysis (Task Group 8)
# ---------------------------------------------------------------------------

class WhatIfFeatureChange(BaseModel):
    feature_name: str
    delta_type: str = "absolute"  # "absolute" | "percentage" | "set_value"
    delta_value: float


class WhatIfPerturbation(BaseModel):
    feature_name: str
    new_value: Any


class WhatIfRequest(BaseModel):
    base_features: Dict[str, Any]
    feature_changes: List[WhatIfFeatureChange] = []
    perturbations: Optional[List[WhatIfPerturbation]] = None
    model_ids: List[str] = ["vqc", "logistic_regression", "random_forest", "svm"]


class WhatIfModelResult(BaseModel):
    model_id: str
    model_name: str
    baseline_probability: float
    modified_probability: float
    delta: float
    direction: str  # "increased" | "decreased" | "unchanged"


class WhatIfSingleResult(BaseModel):
    feature_changed: str
    delta_type: str
    delta_value: float
    model_results: List[WhatIfModelResult]


class WhatIfResponse(BaseModel):
    baseline_features: Dict[str, Any]
    modified_features: Dict[str, Any]
    results: List[WhatIfSingleResult] = []
    models: Dict[str, Any] = {}
    disclaimer: str = (
        "This is a sensitivity/what-if experiment showing how model outputs change "
        "with feature perturbations. It is NOT a causal medical inference."
    )


# ---------------------------------------------------------------------------
# Model Disagreement Analysis (Task Group 9)
# ---------------------------------------------------------------------------

class DisagreementSample(BaseModel):
    sample_index: int
    true_label: Optional[int] = None
    model_probabilities: Dict[str, float]  # model_id → P(positive)
    model_predictions: Dict[str, int]       # model_id → 0 or 1
    max_disagreement: float                 # max pairwise |prob_i - prob_j|
    is_quantum_classical_disagreement: bool


class DisagreementAnalysisResponse(BaseModel):
    total_samples: int
    disagreement_threshold: float
    disagreeing_samples: List[DisagreementSample]
    disagreement_count: int
    disagreement_rate: float
    summary_stats: Dict[str, Any]
    disclaimer: str = (
        "Model disagreement shows where decision boundaries differ between models. "
        "It does NOT constitute evidence of quantum advantage."
    )


# ---------------------------------------------------------------------------
# Quantum Utility Report (Task Group 10)
# ---------------------------------------------------------------------------

class QuantumUtilityReport(BaseModel):
    experiment_id: str = "exp-active"
    generated_at: str
    # Dataset
    dataset_name: str
    sample_count: int = 0
    feature_count: int = 0
    quantum_dimensions: int = 6
    # Circuit
    n_qubits: int = 6
    feature_map: str = "ZZFeatureMap"
    ansatz: str = "RealAmplitudes"
    ansatz_layers: int = 2
    optimizer: str = "COBYLA"
    training_mode: str = "DEMO_MODE"
    vqc_training_samples: int = 0
    vqc_iterations: int = 25
    # CV metrics
    cv_metrics: Dict[str, Any] = {}
    # Held-out test metrics
    held_out_metrics: Dict[str, Any] = {}
    # Classical baselines (model_id → metrics dict)
    classical_baselines: Dict[str, Any] = {}
    # Noise robustness
    noise_robustness: Dict[str, Any] = {}
    # Resource usage
    resource_usage: Dict[str, Any] = {}
    # Analysis summaries
    fold_variability: Dict[str, Any] = {}
    disagreement_summary: Optional[Dict[str, Any]] = None
    explainability_summary: Optional[Dict[str, Any]] = None
    # Evidence
    evidence_verdict: str = "INSUFFICIENT_EVIDENCE"
    evidence_explanation: str = ""
    # UI convenience fields & audits
    benchmark_verdict: Optional[str] = None
    verdict_explanation: Optional[str] = None
    quantum_strengths: List[str] = []
    quantum_limitations: List[str] = []
    methodological_disclaimers: List[str] = []
    # Final conclusion
    conclusion: str = ""

