from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import numpy as np


class BaseDiseaseClassifier(ABC):
    """Unified interface for both classical and quantum disease detection classifiers."""

    def __init__(self, model_id: str, model_name: str, model_type: str = "classical"):
        self.model_id = model_id
        self.model_name = model_name
        self.model_type = model_type
        self.is_fitted: bool = False
        self.training_time_seconds: float = 0.0

    @abstractmethod
    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "BaseDiseaseClassifier":
        """Fit model on processed feature matrix X and binary labels y."""
        pass

    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict binary class labels (0 or 1) for input feature matrix X."""
        pass

    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict class probabilities [P(negative), P(positive)] for input feature matrix X."""
        pass

    @abstractmethod
    def get_params(self) -> Dict[str, Any]:
        """Return model hyperparameters and configuration."""
        pass

    def save(self, file_path: str) -> None:
        """Persist model state to disk using joblib."""
        import joblib
        joblib.dump(self, file_path)

    @classmethod
    def load(cls, file_path: str) -> "BaseDiseaseClassifier":
        """Load persisted model state from disk."""
        import joblib
        return joblib.load(file_path)
