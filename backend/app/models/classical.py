import time
from typing import Any, Dict
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC

from app.models.base import BaseDiseaseClassifier


class LogisticRegressionDiseaseClassifier(BaseDiseaseClassifier):
    """Logistic Regression baseline classifier for clinical benchmarking."""

    def __init__(self, random_state: int = 42, max_iter: int = 500, C: float = 1.0):
        super().__init__(
            model_id="logistic_regression",
            model_name="Logistic Regression",
            model_type="classical",
        )
        self.random_state = random_state
        self.max_iter = max_iter
        self.C = C
        self.model = LogisticRegression(
            random_state=self.random_state,
            max_iter=self.max_iter,
            C=self.C,
            class_weight="balanced",
        )

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "LogisticRegressionDiseaseClassifier":
        start_time = time.perf_counter()
        self.model.fit(X, y)
        self.training_time_seconds = float(time.perf_counter() - start_time)
        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict_proba(X)

    def get_params(self) -> Dict[str, Any]:
        return {
            "solver": "lbfgs",
            "C": self.C,
            "max_iter": self.max_iter,
            "class_weight": "balanced",
            "random_state": self.random_state,
        }


class RandomForestDiseaseClassifier(BaseDiseaseClassifier):
    """Random Forest ensemble classifier for non-linear feature interactions."""

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 6,
        random_state: int = 42,
    ):
        super().__init__(
            model_id="random_forest",
            model_name="Random Forest",
            model_type="classical",
        )
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            random_state=self.random_state,
            class_weight="balanced",
        )

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "RandomForestDiseaseClassifier":
        start_time = time.perf_counter()
        self.model.fit(X, y)
        self.training_time_seconds = float(time.perf_counter() - start_time)
        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict_proba(X)

    def get_params(self) -> Dict[str, Any]:
        return {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "class_weight": "balanced",
            "random_state": self.random_state,
        }


class SVMDiseaseClassifier(BaseDiseaseClassifier):
    """Support Vector Machine classifier with calibrated probabilities."""

    def __init__(
        self,
        C: float = 1.0,
        kernel: str = "rbf",
        random_state: int = 42,
    ):
        super().__init__(
            model_id="svm",
            model_name="Support Vector Machine (SVM)",
            model_type="classical",
        )
        self.C = C
        self.kernel = kernel
        self.random_state = random_state
        self.model = SVC(
            C=self.C,
            kernel=self.kernel,
            probability=True,
            random_state=self.random_state,
            class_weight="balanced",
        )

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "SVMDiseaseClassifier":
        start_time = time.perf_counter()
        self.model.fit(X, y)
        self.training_time_seconds = float(time.perf_counter() - start_time)
        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"{self.model_name} is not fitted.")
        return self.model.predict_proba(X)

    def get_params(self) -> Dict[str, Any]:
        return {
            "C": self.C,
            "kernel": self.kernel,
            "probability": True,
            "class_weight": "balanced",
            "random_state": self.random_state,
        }
