from typing import Dict, List, Optional
import pandas as pd
import numpy as np

from app.data.preprocessor import ClinicalPreprocessor
from app.models.base import BaseDiseaseClassifier
from app.schemas import (
    BenchmarkSummary,
    DatasetConfigRequest,
    DatasetProfileResponse,
    ExplainabilityResult,
    ModelEvaluationResult,
    PreprocessingSummary,
    StepStatus,
    TrainingStatusResponse,
)


class AppState:
    """Global application state manager."""

    def __init__(self):
        self.raw_df: Optional[pd.DataFrame] = None
        self.dataset_name: str = "None"
        self.dataset_profile: Optional[DatasetProfileResponse] = None
        self.dataset_config: Optional[DatasetConfigRequest] = None

        # Preprocessing state
        self.preprocessor: Optional[ClinicalPreprocessor] = None
        self.preprocessing_summary: Optional[PreprocessingSummary] = None
        
        self.X_train: Optional[np.ndarray] = None
        self.X_test: Optional[np.ndarray] = None
        self.y_train: Optional[np.ndarray] = None
        self.y_test: Optional[np.ndarray] = None

        # Trained Models
        self.models: Dict[str, BaseDiseaseClassifier] = {}
        
        # Benchmark results and explainability cache
        self.evaluation_results: Dict[str, ModelEvaluationResult] = {}
        self.explainability_cache: Dict[str, ExplainabilityResult] = {}
        self.benchmark_summary: Optional[BenchmarkSummary] = None

        # Training status
        self.is_training: bool = False
        self.current_step: str = "Idle"
        self.overall_progress: int = 0
        self.steps: List[StepStatus] = [
            StepStatus(name="Dataset Preprocessing", status="pending"),
            StepStatus(name="Classical Models Training", status="pending"),
            StepStatus(name="Quantum VQC Optimization", status="pending"),
            StepStatus(name="Evaluation & Explainability", status="pending"),
        ]
        self.error_message: Optional[str] = None

    def reset_for_new_dataset(self, df: pd.DataFrame, dataset_name: str):
        self.raw_df = df
        self.dataset_name = dataset_name
        self.dataset_profile = None
        self.dataset_config = None
        self.preprocessor = None
        self.preprocessing_summary = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.models.clear()
        self.evaluation_results.clear()
        self.explainability_cache.clear()
        self.benchmark_summary = None
        self.reset_training_status()

    def reset_training_status(self):
        self.is_training = False
        self.current_step = "Idle"
        self.overall_progress = 0
        self.error_message = None
        self.steps = [
            StepStatus(name="Dataset Preprocessing", status="pending"),
            StepStatus(name="Classical Models Training", status="pending"),
            StepStatus(name="Quantum VQC Optimization", status="pending"),
            StepStatus(name="Evaluation & Explainability", status="pending"),
        ]

    def get_training_status(self) -> TrainingStatusResponse:
        return TrainingStatusResponse(
            is_training=self.is_training,
            current_step=self.current_step,
            overall_progress=self.overall_progress,
            steps=self.steps,
            error_message=self.error_message,
        )


app_state = AppState()
