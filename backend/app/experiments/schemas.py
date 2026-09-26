from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas import (
    BenchmarkSummary,
    ClassicalModelConfig,
    DatasetConfigRequest,
    DatasetProfileResponse,
    DisagreementAnalysis,
    ExperimentMetadata,
    ExplainabilityResult,
    ModelEvaluationResult,
    PreprocessingRequest,
    PreprocessingSummary,
    QuantumModelConfig,
    QuantumUtilityReport,
    StepStatus,
)


from app.evidence.evidence_engine import QuantumEvidenceSummary

class JobStatus(str, Enum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PREPROCESSING = "PREPROCESSING"
    CLASSICAL_TRAINING = "CLASSICAL_TRAINING"
    QUANTUM_TRAINING = "QUANTUM_TRAINING"
    CROSS_VALIDATION = "CROSS_VALIDATION"
    NOISE_EVALUATION = "NOISE_EVALUATION"
    EXPLAINABILITY = "EXPLAINABILITY"
    REPORT_GENERATION = "REPORT_GENERATION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class QuantumResourceMetrics(BaseModel):
    qubit_count: int = Field(..., description="Number of qubits in circuit (matches PCA dimension)")
    circuit_depth: int = Field(..., description="Ansatz depth in 2-qubit entanglement layers")
    parameter_count: int = Field(..., description="Number of trainable variational angles θ")
    optimization_iterations: int = Field(..., description="Optimization iterations performed")
    circuit_evaluations: int = Field(..., description="Total statevector / expectation value queries")
    simulation_time_seconds: float = Field(..., description="Approximate CPU/GPU simulation wall-clock time")
    inference_latency_ms: float = Field(..., description="Per-patient expectation evaluation latency in milliseconds")
    simulator_backend: str = Field(..., description="Execution backend (Qiskit Statevector / Aer)")


class ClassicalResourceMetrics(BaseModel):
    model_id: str
    model_name: str
    parameter_count_summary: str
    training_time_seconds: float
    inference_latency_ms: float


class DatasetResourceMetrics(BaseModel):
    raw_rows: int
    raw_columns: int
    encoded_dimensions: int
    selected_dimensions: int
    pca_dimensions: int
    dimension_compression_ratio: float


class ResourceProfile(BaseModel):
    experiment_id: str
    experiment_name: str
    timestamp_utc: str
    quantum_resources: QuantumResourceMetrics
    classical_resources: List[ClassicalResourceMetrics]
    dataset_resources: DatasetResourceMetrics
    measured_vs_configured_notes: str
    scalability_disclaimer: str = (
        "Observed resource metrics are measured on local CPU statevector / Aer simulation. "
        "Physical quantum execution on fault-tolerant hardware exhibits distinct asymptotic scaling, "
        "circuit compilation overhead, and error mitigation budgets."
    )


class ExperimentCreateRequest(BaseModel):
    experiment_name: Optional[str] = None
    dataset_name: Optional[str] = "breast_cancer_wisconsin"
    description: Optional[str] = ""
    quantum_config: Optional[QuantumModelConfig] = None
    classical_config: Optional[ClassicalModelConfig] = None
    preprocessing_config: Optional[PreprocessingRequest] = None
    dataset_config: Optional[DatasetConfigRequest] = None


class ExperimentSummary(BaseModel):
    experiment_id: str
    experiment_name: str
    created_at_utc: str
    dataset_name: str
    dataset_rows: int
    feature_count: int
    n_qubits: int
    status: JobStatus
    progress_percent: int
    current_stage: str
    best_model_name: Optional[str] = None
    best_auc: Optional[float] = None
    verdict: Optional[str] = None


class ExperimentDetail(BaseModel):
    experiment_id: str
    experiment_name: str
    created_at_utc: str
    updated_at_utc: str
    user_id: Optional[str] = "guest"
    description: Optional[str] = ""
    
    # Dataset Provenance
    dataset_name: str
    dataset_fingerprint: str
    dataset_rows: int
    dataset_columns: int
    target_column: str
    positive_class: str
    
    # Configurations
    dataset_config: Optional[DatasetConfigRequest] = None
    preprocessing_config: Optional[PreprocessingRequest] = None
    preprocessing_summary: Optional[PreprocessingSummary] = None
    quantum_config: Optional[QuantumModelConfig] = None
    classical_config: Optional[ClassicalModelConfig] = None
    
    # Job / Execution State
    status: JobStatus = JobStatus.CREATED
    progress_percent: int = 0
    current_stage: str = "Idle"
    steps: List[StepStatus] = []
    job_start_time: Optional[str] = None
    job_end_time: Optional[str] = None
    error_message: Optional[str] = None
    
    # Benchmark & Evidence
    benchmark_summary: Optional[BenchmarkSummary] = None
    noisy_vqc_result: Optional[ModelEvaluationResult] = None
    evidence: Optional[QuantumEvidenceSummary] = None
    explainability: Dict[str, ExplainabilityResult] = {}
    disagreement: Optional[DisagreementAnalysis] = None
    utility_report: Optional[QuantumUtilityReport] = None
    resource_profile: Optional[ResourceProfile] = None
    metadata: Optional[ExperimentMetadata] = None


class ExperimentComparisonItem(BaseModel):
    experiment_id: str
    experiment_name: str
    created_at_utc: str
    dataset_name: str
    n_qubits: int
    ansatz: str
    feature_map: str
    ansatz_layers: int
    
    # VQC Metrics
    vqc_auc_mean: Optional[float] = None
    vqc_auc_std: Optional[float] = None
    vqc_sensitivity: Optional[float] = None
    vqc_specificity: Optional[float] = None
    vqc_f1: Optional[float] = None
    vqc_brier: Optional[float] = None
    vqc_runtime_seconds: Optional[float] = None
    vqc_parameter_count: Optional[int] = None
    
    # Best Classical Metrics
    best_classical_model: Optional[str] = None
    best_classical_auc: Optional[float] = None
    best_classical_f1: Optional[float] = None
    
    # Noisy Retention
    noisy_auc_retention_percent: Optional[float] = None
    verdict: Optional[str] = None


class ExperimentComparisonResponse(BaseModel):
    experiments: List[ExperimentComparisonItem]
    comparison_timestamp_utc: str
    neutral_empirical_notes: str = (
        "Empirical comparative summary across isolated parameter runs. "
        "Differences in metrics reflect observed performance under fixed random seeds and evaluation splits."
    )
