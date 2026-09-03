from abc import ABC, abstractmethod
from typing import Any, Dict, List, Type
from app.models.base import BaseDiseaseClassifier


class QuantumModel(BaseDiseaseClassifier, ABC):
    """Abstract interface for extensible quantum machine learning models."""

    def __init__(self, model_id: str, model_name: str):
        super().__init__(model_id=model_id, model_name=model_name, model_type="quantum")

    @abstractmethod
    def get_config(self) -> Dict[str, Any]:
        """Return quantum circuit and optimizer metadata."""
        pass

    @abstractmethod
    def get_metrics(self) -> Dict[str, Any]:
        """Return latest fitted convergence or evaluation metrics."""
        pass


class QuantumModelRegistry:
    """Central registry for discovering and instantiating available quantum models."""

    _registry: Dict[str, Type[QuantumModel]] = {}

    @classmethod
    def register(cls, model_id: str, model_class: Type[QuantumModel]) -> None:
        cls._registry[model_id.lower()] = model_class

    @classmethod
    def get(cls, model_id: str) -> Type[QuantumModel]:
        key = model_id.lower()
        if key not in cls._registry:
            raise KeyError(f"Quantum model '{model_id}' is not registered. Registered: {list(cls._registry.keys())}")
        return cls._registry[key]

    @classmethod
    def list_models(cls) -> List[Dict[str, Any]]:
        return [{"model_id": k, "class_name": v.__name__} for k, v in cls._registry.items()]
